import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import {
    SEARCH_COLLECTION_MEMBERS,
    SEARCH_COLLECTION_OPPORTUNITIES,
    SearchEntityType,
    SearchProviderName,
} from "../search.constants";
import { SearchDocument, VendorSearchParams, VendorSearchResult } from "../search-document.types";
import { SearchProvider } from "./search-provider.interface";

@Injectable()
export class TypesenseSearchProvider implements SearchProvider {
    readonly name = SearchProviderName.TYPESENSE;
    private readonly logger = new Logger(TypesenseSearchProvider.name);
    private readonly client: AxiosInstance;
    private readonly membersCollection: string;
    private readonly opportunitiesCollection: string;

    constructor(private readonly config: ConfigService) {
        const host = this.config.get<string>("TYPESENSE_HOST") || "http://localhost:8108";
        const apiKey = this.config.get<string>("TYPESENSE_API_KEY") || "";
        this.membersCollection =
            this.config.get<string>("TYPESENSE_COLLECTION_MEMBERS") || SEARCH_COLLECTION_MEMBERS;
        this.opportunitiesCollection =
            this.config.get<string>("TYPESENSE_COLLECTION_OPPORTUNITIES") ||
            SEARCH_COLLECTION_OPPORTUNITIES;

        this.client = axios.create({
            baseURL: host.replace(/\/$/, ""),
            headers: {
                "X-TYPESENSE-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            timeout: 10_000,
        });
    }

    async ensureSchema(): Promise<void> {
        await this.ensureCollection(this.membersCollection, this.memberFields());
        await this.ensureCollection(this.opportunitiesCollection, this.opportunityFields());
    }

    async upsert(documents: SearchDocument[]): Promise<void> {
        if (!documents.length) return;

        const members = documents.filter((d) => d.entityType === SearchEntityType.MEMBER);
        const opportunities = documents.filter(
            (d) => d.entityType === SearchEntityType.OPPORTUNITY,
        );

        if (members.length) {
            await this.importDocs(this.membersCollection, members);
        }
        if (opportunities.length) {
            await this.importDocs(this.opportunitiesCollection, opportunities);
        }
    }

    async delete(entityType: SearchEntityType, id: string): Promise<void> {
        const collection =
            entityType === SearchEntityType.MEMBER
                ? this.membersCollection
                : this.opportunitiesCollection;
        try {
            await this.client.delete(`/collections/${collection}/documents/${id}`);
        } catch (err: unknown) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status !== 404) {
                this.logger.warn(`Typesense delete failed for ${entityType}:${id}: ${String(err)}`);
            }
        }
    }

    async search(params: VendorSearchParams): Promise<VendorSearchResult> {
        const searches = params.types.map((type) => {
            const collection =
                type === SearchEntityType.MEMBER
                    ? this.membersCollection
                    : this.opportunitiesCollection;

            const filterParts: string[] = [];
            if (params.guestSafe) filterParts.push("isPublic:true");
            if (params.capLevel && type === SearchEntityType.MEMBER) {
                filterParts.push(`capLevel:=\`${params.capLevel}\``);
            }
            if (type === SearchEntityType.OPPORTUNITY && params.guestSafe) {
                filterParts.push("isActive:true");
            }

            const qParts = [params.q?.trim(), params.location?.trim()].filter(Boolean);
            const q = qParts.length ? qParts.join(" ") : "*";

            return {
                collection,
                q,
                query_by:
                    type === SearchEntityType.MEMBER
                        ? "displayName,username,bioSnippet,skills,location,capLevel"
                        : "title,descriptionSnippet,orgName,location",
                filter_by: filterParts.length ? filterParts.join(" && ") : undefined,
                per_page: params.limit,
                page: params.page,
                sort_by: "capRank:desc",
            };
        });

        const { data } = await this.client.post("/multi_search", { searches });
        const results = (data?.results ?? []) as {
            found?: number;
            hits?: { document: Record<string, unknown>; text_match?: number }[];
        }[];

        const hits = results.flatMap((r, idx) => {
            const entityType = params.types[idx];
            return (r.hits ?? []).map((h) => ({
                id: String(h.document.id),
                entityType,
                score: h.text_match ?? 0,
            }));
        });

        hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

        const found = results.reduce((sum, r) => sum + (r.found ?? 0), 0);
        return { hits: hits.slice(0, params.limit), found };
    }

    private async ensureCollection(name: string, fields: Record<string, unknown>[]): Promise<void> {
        try {
            await this.client.get(`/collections/${name}`);
        } catch (err: unknown) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status !== 404) throw err;

            await this.client.post("/collections", {
                name,
                fields,
                default_sorting_field: "capRank",
            });
            this.logger.log(`Created Typesense collection: ${name}`);
        }
    }

    private async importDocs(collection: string, docs: SearchDocument[]): Promise<void> {
        const payload = docs.map((d) => JSON.stringify(d)).join("\n");
        await this.client.post(
            `/collections/${collection}/documents/import?action=upsert`,
            payload,
            { headers: { "Content-Type": "text/plain" } },
        );
    }

    private memberFields() {
        return [
            { name: "id", type: "string" },
            { name: "entityType", type: "string", facet: true },
            { name: "displayName", type: "string" },
            { name: "username", type: "string" },
            { name: "bioSnippet", type: "string", optional: true },
            { name: "skills", type: "string[]", facet: true, optional: true },
            { name: "capLevel", type: "string", facet: true },
            { name: "capRank", type: "int32" },
            { name: "location", type: "string", optional: true, facet: true },
            { name: "volunteerOptIn", type: "bool", facet: true },
            { name: "isPublic", type: "bool", facet: true },
        ];
    }

    private opportunityFields() {
        return [
            { name: "id", type: "string" },
            { name: "entityType", type: "string", facet: true },
            { name: "title", type: "string" },
            { name: "descriptionSnippet", type: "string", optional: true },
            { name: "orgName", type: "string", optional: true },
            { name: "location", type: "string", optional: true, facet: true },
            { name: "verifiedPartner", type: "bool", facet: true },
            { name: "isActive", type: "bool", facet: true },
            { name: "isPublic", type: "bool", facet: true },
            { name: "capRank", type: "int32" },
        ];
    }
}
