import { Injectable } from "@nestjs/common";
import { SearchEntityType, SearchProviderName } from "../search.constants";
import { SearchDocument, VendorSearchParams, VendorSearchResult } from "../search-document.types";
import { SearchProvider } from "./search-provider.interface";

/** No-op provider when SEARCH_PROVIDER=off or misconfigured. */
@Injectable()
export class OffSearchProvider implements SearchProvider {
    readonly name = SearchProviderName.OFF;

    async ensureSchema(): Promise<void> {
        return;
    }

    async upsert(documents: SearchDocument[]): Promise<void> {
        void documents;
    }

    async delete(entityType: SearchEntityType, id: string): Promise<void> {
        void entityType;
        void id;
    }

    async search(params: VendorSearchParams): Promise<VendorSearchResult> {
        void params;
        return { hits: [], found: 0 };
    }
}
