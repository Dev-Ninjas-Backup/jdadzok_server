import { SearchEntityType } from "./search.constants";

export interface MemberSearchDocument {
    id: string;
    entityType: SearchEntityType.MEMBER;
    displayName: string;
    username: string;
    bioSnippet: string;
    skills: string[];
    capLevel: string;
    capRank: number;
    location: string;
    volunteerOptIn: boolean;
    /** Guest-safe flag — false excludes from guest search. */
    isPublic: boolean;
}

export interface OpportunitySearchDocument {
    id: string;
    entityType: SearchEntityType.OPPORTUNITY;
    title: string;
    descriptionSnippet: string;
    orgName: string;
    location: string;
    verifiedPartner: boolean;
    isActive: boolean;
    /** Active opportunities are public; inactive are not. */
    isPublic: boolean;
    capRank: number;
}

export type SearchDocument = MemberSearchDocument | OpportunitySearchDocument;

export interface SearchHit {
    id: string;
    entityType: SearchEntityType;
    score?: number;
}

export interface VendorSearchParams {
    q: string;
    types: SearchEntityType[];
    guestSafe: boolean;
    page: number;
    limit: number;
    location?: string;
    capLevel?: string;
}

export interface VendorSearchResult {
    hits: SearchHit[];
    found: number;
}
