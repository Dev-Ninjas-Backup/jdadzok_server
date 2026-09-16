export interface CsvColumn {
    key: string;
    label: string;
}

function stringifyCsvValue(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return JSON.stringify(value);
}

function escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    const str = stringifyCsvValue(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function getByPath(row: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((value, key) => {
        if (value && typeof value === "object") {
            return (value as Record<string, unknown>)[key];
        }
        return undefined;
    }, row);
}

/** Converts an array of objects to a CSV string, using dot-paths in column keys for nested fields. */
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
    const header = columns.map((col) => escapeCsvValue(col.label)).join(",");
    const lines = rows.map((row) =>
        columns.map((col) => escapeCsvValue(getByPath(row, col.key))).join(","),
    );
    return [header, ...lines].join("\n");
}
