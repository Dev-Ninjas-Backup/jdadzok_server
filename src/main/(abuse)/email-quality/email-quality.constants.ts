export const EMAIL_QUALITY_PROVIDER_TOKEN = Symbol("EMAIL_QUALITY_PROVIDER");

export enum EmailQualityProviderName {
    OFF = "off",
    ABSTRACT = "abstract",
    KICKBOX = "kickbox",
    /** Local / CI only — deterministic stand-in (no external SaaS). */
    MEMORY = "memory",
}
