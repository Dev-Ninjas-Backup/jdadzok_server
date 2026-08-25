import { Injectable } from "@nestjs/common";
import { SearchEntityType, SearchProviderName } from "../search.constants";
import {
    SearchDocument,
    VendorSearchParams,
    VendorSearchResult,
} from "../search-document.types";
import { SearchProvider } from "./search-provider.interface";

/** No-op provider when SEARCH_PROVIDER=off or misconfigured. */
@Injectable()
export class OffSearchProvider implements SearchProvider {
    readonly name = SearchProviderName.OFF;

    async ensureSchema(): Promise<void> {
        return;
    }

    async upsert(_documents: SearchDocument[]): Promise<void> {
        return;
    }

    async delete(_entityType: SearchEntityType, _id: string): Promise<void> {
        return;
    }

    async search(_params: VendorSearchParams): Promise<VendorSearchResult> {
        return { hits: [], found: 0 };
    }
}
