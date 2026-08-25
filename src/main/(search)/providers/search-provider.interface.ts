import { SearchEntityType } from "../search.constants";
import {
    SearchDocument,
    VendorSearchParams,
    VendorSearchResult,
} from "../search-document.types";

export interface SearchProvider {
    readonly name: string;

    /** Create collections / indices if missing (idempotent). */
    ensureSchema(): Promise<void>;

    upsert(documents: SearchDocument[]): Promise<void>;

    delete(entityType: SearchEntityType, id: string): Promise<void>;

    search(params: VendorSearchParams): Promise<VendorSearchResult>;
}
