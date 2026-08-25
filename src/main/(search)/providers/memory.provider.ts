import { Injectable } from "@nestjs/common";
import { SearchEntityType, SearchProviderName } from "../search.constants";
import {
    SearchDocument,
    VendorSearchParams,
    VendorSearchResult,
} from "../search-document.types";
import { SearchProvider } from "./search-provider.interface";

/**
 * In-memory Typesense/Algolia stand-in for local/CI tests.
 * Same adapter contract — no custom ML ranking.
 */
@Injectable()
export class MemorySearchProvider implements SearchProvider {
    readonly name = SearchProviderName.MEMORY;

    private readonly store = new Map<string, SearchDocument>();

    async ensureSchema(): Promise<void> {
        return;
    }

    async upsert(documents: SearchDocument[]): Promise<void> {
        for (const doc of documents) {
            this.store.set(this.key(doc.entityType, doc.id), doc);
        }
    }

    async delete(entityType: SearchEntityType, id: string): Promise<void> {
        this.store.delete(this.key(entityType, id));
    }

    async search(params: VendorSearchParams): Promise<VendorSearchResult> {
        const q = params.q.trim().toLowerCase();
        const typeSet = new Set(params.types);

        let docs = [...this.store.values()].filter((d) => typeSet.has(d.entityType));

        if (params.guestSafe) {
            docs = docs.filter((d) => d.isPublic);
        }

        if (params.location) {
            const loc = params.location.toLowerCase();
            docs = docs.filter((d) => (d.location || "").toLowerCase().includes(loc));
        }

        if (params.capLevel) {
            docs = docs.filter(
                (d) => d.entityType === SearchEntityType.MEMBER && d.capLevel === params.capLevel,
            );
        }

        const scored = docs
            .map((d) => ({ doc: d, score: this.score(d, q) }))
            .filter((x) => (q ? x.score > 0 : true))
            .sort((a, b) => b.score - a.score || b.doc.capRank - a.doc.capRank);

        const start = (params.page - 1) * params.limit;
        const page = scored.slice(start, start + params.limit);

        return {
            found: scored.length,
            hits: page.map((x) => ({
                id: x.doc.id,
                entityType: x.doc.entityType,
                score: x.score,
            })),
        };
    }

    /** Test helper — clear store between cases. */
    clear(): void {
        this.store.clear();
    }

    /** Test helper — inspect indexed docs. */
    all(): SearchDocument[] {
        return [...this.store.values()];
    }

    private key(entityType: SearchEntityType, id: string): string {
        return `${entityType}:${id}`;
    }

    private score(doc: SearchDocument, q: string): number {
        if (!q) return doc.capRank;

        const haystack = this.haystack(doc).toLowerCase();
        if (haystack.includes(q)) return 100 + doc.capRank;

        const tokens = q.split(/\s+/).filter(Boolean);
        let hits = 0;
        for (const t of tokens) {
            if (haystack.includes(t)) hits += 1;
        }
        return hits > 0 ? hits * 20 + doc.capRank : 0;
    }

    private haystack(doc: SearchDocument): string {
        if (doc.entityType === SearchEntityType.MEMBER) {
            return [
                doc.displayName,
                doc.username,
                doc.bioSnippet,
                doc.location,
                doc.capLevel,
                ...doc.skills,
            ].join(" ");
        }
        return [doc.title, doc.descriptionSnippet, doc.orgName, doc.location].join(" ");
    }
}
