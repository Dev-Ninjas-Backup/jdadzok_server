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
    isPublic: boolean;
}

/** Shared shape for non-member catalog entities (opportunities, bridge, orgs, posts). */
export interface CatalogSearchDocument {
    id: string;
    entityType:
        | SearchEntityType.OPPORTUNITY
        | SearchEntityType.BRIDGE
        | SearchEntityType.NGO
        | SearchEntityType.COMMUNITY
        | SearchEntityType.POST;
    title: string;
    descriptionSnippet: string;
    orgName: string;
    location: string;
    skills: string[];
    tags: string[];
    listingType: string;
    verifiedPartner: boolean;
    isActive: boolean;
    isPublic: boolean;
    capRank: number;
}

export type SearchDocument = MemberSearchDocument | CatalogSearchDocument;

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

export interface ReindexStats {
    members: number;
    opportunities: number;
    bridge: number;
    ngos: number;
    communities: number;
    posts: number;
    provider: string;
}
