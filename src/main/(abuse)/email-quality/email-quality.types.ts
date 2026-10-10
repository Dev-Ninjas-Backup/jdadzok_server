export interface EmailQualityVerdict {
    deliverable: boolean;
    disposable: boolean;
    /** Non-PII vendor reason codes. */
    labels: string[];
}
