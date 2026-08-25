import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";
import {
    SEARCH_COLLECTION_MEMBERS,
    SEARCH_COLLECTION_OPPORTUNITIES,
    SearchEntityType,
    SearchProviderName,
} from "../search.constants";
import {
    SearchDocument,
    VendorSearchParams,
    VendorSearchResult,
} from "../search-document.types";
import { SearchProvider } from "./search-provider.interface";

@Injectable()
export class AlgoliaSearchProvider implements SearchProvider {
    readonly name = SearchProviderName.ALGOLIA;
    private readonly logger = new Logger(AlgoliaSearchProvider.name);
    private readonly writeClient: AxiosInstance;
    private readonly searchClient: AxiosInstance;
    private readonly membersIndex: string;
    private readonly opportunitiesIndex: string;

    constructor(private readonly config: ConfigService) {
        const appId = this.config.get<string>("ALGOLIA_APP_ID") || "";
        const adminKey = this.config.get<string>("ALGOLIA_ADMIN_API_KEY") || "";
        const searchKey =
            this.config.get<string>("ALGOLIA_SEARCH_API_KEY") ||
            this.config.get<string>("ALGOLIA_ADMIN_API_KEY") ||
            "";

        this.membersIndex =
            this.config.get<string>("ALGOLIA_INDEX_MEMBERS") || SEARCH_COLLECTION_MEMBERS;
        this.opportunitiesIndex =
            this.config.get<string>("ALGOLIA_INDEX_OPPORTUNITIES") ||
            SEARCH_COLLECTION_OPPORTUNITIES;

        const headers = (apiKey: string) => ({
            "X-Algolia-Application-Id": appId,
            "X-Algolia-API-Key": apiKey,
            "Content-Type": "application/json",
        });

        this.writeClient = axios.create({
            baseURL: `https://${appId}.algolia.net/1`,
            headers: headers(adminKey),
            timeout: 10_000,
        });
        this.searchClient = axios.create({
            baseURL: `https://${appId}-dsn.algolia.net/1`,
            headers: headers(searchKey),
            timeout: 10_000,
        });
    }

    async ensureSchema(): Promise<void> {
        // Algolia is schemaless; set searchable attributes + ranking hints.
        await Promise.all([
            this.writeClient.put(`/indexes/${this.membersIndex}/settings`, {
                searchableAttributes: [
                    "displayName",
                    "username",
                    "skills",
                    "bioSnippet",
                    "location",
                    "capLevel",
                ],
                attributesForFaceting: [
                    "filterOnly(isPublic)",
                    "filterOnly(entityType)",
                    "capLevel",
                    "volunteerOptIn",
                ],
                customRanking: ["desc(capRank)"],
            }),
            this.writeClient.put(`/indexes/${this.opportunitiesIndex}/settings`, {
                searchableAttributes: ["title", "descriptionSnippet", "orgName", "location"],
                attributesForFaceting: [
                    "filterOnly(isPublic)",
                    "filterOnly(isActive)",
                    "filterOnly(entityType)",
                    "verifiedPartner",
                ],
                customRanking: ["desc(capRank)"],
            }),
        ]);
        this.logger.log("Algolia index settings ensured");
    }

    async upsert(documents: SearchDocument[]): Promise<void> {
        if (!documents.length) return;

        const members = documents.filter((d) => d.entityType === SearchEntityType.MEMBER);
        const opportunities = documents.filter(
            (d) => d.entityType === SearchEntityType.OPPORTUNITY,
        );

        if (members.length) {
            await this.batch(this.membersIndex, members);
        }
        if (opportunities.length) {
            await this.batch(this.opportunitiesIndex, opportunities);
        }
    }

    async delete(entityType: SearchEntityType, id: string): Promise<void> {
        const index =
            entityType === SearchEntityType.MEMBER
                ? this.membersIndex
                : this.opportunitiesIndex;
        try {
            await this.writeClient.delete(`/indexes/${index}/${id}`);
        } catch (err: unknown) {
            const status = axios.isAxiosError(err) ? err.response?.status : undefined;
            if (status !== 404) {
                this.logger.warn(`Algolia delete failed for ${entityType}:${id}: ${String(err)}`);
            }
        }
    }

    async search(params: VendorSearchParams): Promise<VendorSearchResult> {
        const requests = params.types.map((type) => {
            const indexName =
                type === SearchEntityType.MEMBER
                    ? this.membersIndex
                    : this.opportunitiesIndex;

            const filters: string[] = [];
            if (params.guestSafe) filters.push("isPublic:true");
            if (type === SearchEntityType.OPPORTUNITY && params.guestSafe) {
                filters.push("isActive:true");
            }
            if (params.capLevel && type === SearchEntityType.MEMBER) {
                filters.push(`capLevel:${params.capLevel}`);
            }

            const qParts = [params.q?.trim(), params.location?.trim()].filter(Boolean);

            return {
                indexName,
                params: {
                    query: qParts.join(" "),
                    page: params.page - 1,
                    hitsPerPage: params.limit,
                    filters: filters.length ? filters.join(" AND ") : undefined,
                },
            };
        });

        const { data } = await this.searchClient.post("/indexes/*/queries", { requests });
        const results = (data?.results ?? []) as Array<{
            nbHits?: number;
            hits?: Array<{ objectID: string; _score?: number }>;
        }>;

        const hits = results.flatMap((r, idx) =>
            (r.hits ?? []).map((h) => ({
                id: h.objectID,
                entityType: params.types[idx],
                score: h._score ?? 0,
            })),
        );

        hits.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
        const found = results.reduce((sum, r) => sum + (r.nbHits ?? 0), 0);
        return { hits: hits.slice(0, params.limit), found };
    }

    private async batch(index: string, docs: SearchDocument[]): Promise<void> {
        const requests = docs.map((d) => ({
            action: "updateObject",
            body: { ...d, objectID: d.id },
        }));
        await this.writeClient.post(`/indexes/${index}/batch`, { requests });
    }
}
