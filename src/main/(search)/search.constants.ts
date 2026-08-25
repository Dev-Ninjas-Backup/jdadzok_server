export const SEARCH_PROVIDER_TOKEN = Symbol("SEARCH_PROVIDER");

export enum SearchProviderName {
    OFF = "off",
    TYPESENSE = "typesense",
    ALGOLIA = "algolia",
    /** Local / CI only — in-memory vendor stand-in (no external SaaS). */
    MEMORY = "memory",
}

export enum SearchEntityType {
    MEMBER = "member",
    OPPORTUNITY = "opportunity",
    BRIDGE = "bridge",
    NGO = "ngo",
    COMMUNITY = "community",
    POST = "post",
}

export const ALL_SEARCH_ENTITY_TYPES: SearchEntityType[] = [
    SearchEntityType.MEMBER,
    SearchEntityType.OPPORTUNITY,
    SearchEntityType.BRIDGE,
    SearchEntityType.NGO,
    SearchEntityType.COMMUNITY,
    SearchEntityType.POST,
];

export const SEARCH_COLLECTION_BY_TYPE: Record<SearchEntityType, string> = {
    [SearchEntityType.MEMBER]: "members",
    [SearchEntityType.OPPORTUNITY]: "opportunities",
    [SearchEntityType.BRIDGE]: "bridge_listings",
    [SearchEntityType.NGO]: "ngos",
    [SearchEntityType.COMMUNITY]: "communities",
    [SearchEntityType.POST]: "posts",
};

/** Cap-weighted visibility hint (higher = prefer in vendor ranking). */
export const CAP_RANK: Record<string, number> = {
    SKY_BLUE: 600,
    BLACK: 500,
    RED: 400,
    YELLOW: 300,
    GREEN: 200,
    NONE: 100,
};

/** Fields that must never be sent to a search vendor. */
export const SEARCH_FORBIDDEN_FIELDS = [
    "email",
    "password",
    "stripeAccountId",
    "stripeCustomerId",
    "balance",
    "dateOfBirth",
    "authProvider",
] as const;
