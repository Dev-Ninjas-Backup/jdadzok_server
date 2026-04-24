import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import slug from "slugify";
import { Socket } from "socket.io";
import { ZodError, ZodSchema } from "zod";

export function parseQueryParams<T, U>(
    query: Record<string, any>,
    querySchema: ZodSchema<T>,
    modelSchema?: ZodSchema<U>,
): T & Partial<U> {
    // First, parse the common query schema (pagination, search, etc.)
    const { error, data } = querySchema.safeParse(query);

    if (error) throw new Error("Invalid query params");

    const parsedQuery = { ...data } as any;

    if (modelSchema) {
        const modelResult = modelSchema.safeParse(query);

        if (!modelResult.success) {
            throw new ZodError(modelResult.error.errors); // Handle validation errors for model-specific fields
        }

        // Add model-specific fields (e.g., `include`, `metadata`) to the parsed query object
        for (const key in modelResult.data) {
            parsedQuery[key] = modelResult.data[key];
        }
    }

    for (const key in parsedQuery) {
        parsedQuery[key] = parseValue(parsedQuery[key]);
    }

    return parsedQuery as T & Partial<U>;
}

function parseValue(value: any): any {
    if (typeof value === "string") {
        const lowered = value.toLowerCase();
        if (lowered === "true") return true;
        if (lowered === "false") return false;
        if (!isNaN(Number(value))) return Number(value);
        if (lowered === "null") return null;
    }
    return value;
}

export function capitalize(str: string) {
    if (str.length === 0) {
        return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export const slugify = (textContent: string, replacement: "-" | "_" = "-") =>
    slug(textContent, {
        trim: true,
        lower: true,
        strict: true,
        replacement,
        // remove all spacial characters except for replacement character
        remove: /[^\w\s-]|_/g,
    });

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keys.includes(key as K)),
    ) as Omit<T, K>;
};
export const getUserFromSocket = (client: Socket): { sub: string; email?: string } => {
    return client.data?.user;
};

export function generateRedisKey<T extends string>(key: T, suffix?: string) {
    return suffix ? `${key}:${suffix}` : key;
}

// ============ socket =========== //
type SafeParseResult<D> =
    | { success: true; data: D }
    | { success: false; errors: ValidationError[] };

export async function safeParseAsync<D extends object, I = unknown>(
    dtoClass: new () => D,
    input: I,
): Promise<SafeParseResult<D>> {
    const dtoInstance = plainToInstance(dtoClass, input, {
        enableImplicitConversion: true,
    });

    const errors = await validate(dtoInstance, {
        whitelist: true, // ✅ strips unknown properties
        // forbidNonWhitelisted: true, // ✅ throws if unknown props exist
    });

    if (errors.length > 0) {
        return { success: false, errors };
    }

    return { success: true, data: dtoInstance };
}
