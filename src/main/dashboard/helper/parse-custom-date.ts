import { DateTime } from "luxon";

/**
 * Parses a custom date string into JS Date.
 * Format must include year: "yyyy-MM-dd h:mm AM/PM"
 */
export function parseCustomDate(input: string): Date | null {
    if (!input) return null;

    // Replace dot with colon if user entered it by mistake
    const normalized = input.replace(".", ":").trim();

    // Strict parsing with year included
    const dt = DateTime.fromFormat(normalized, "yyyy-MM-dd h:mm a", { zone: "Asia/Dhaka" });

    return dt.isValid ? dt.toJSDate() : null;
}

export function formatCustomDate(date: Date): string {
    return DateTime.fromJSDate(date).setZone("Asia/Dhaka").toFormat("yyyy-MM-dd h:mm a");
}
