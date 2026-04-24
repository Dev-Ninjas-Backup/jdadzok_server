import { z } from "zod";

export const requiredString = (fieldName: string) =>
    z
        .string({
            required_error: `${fieldName} is required.`,
            invalid_type_error: `${fieldName} must be a valid string.`,
        })
        .trim()
        .min(1, `${fieldName} cannot be empty.`);

export const requiredSlug = (minLength = 3, maxLength = 100) => {
    return z
        .string()
        .min(minLength, {
            message: "Slug must be at least 3 characters long.",
        })
        .max(maxLength, {
            message: "Slug must not exceed 100 characters.",
        })
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
            message:
                "Slug must only contain lowercase letters, numbers, and hyphens, and must not start or end with a hyphen.",
        });
};

// Utility for creating URL validation with better error handling
export const requiredUrl = (fieldName: string, isDatabase = true) => {
    if (isDatabase) {
        return requiredString(fieldName).url(`${fieldName} must be a valid URL.`);
    } else {
        return requiredString(fieldName)
            .url(`${fieldName} must be a valid URL.`)
            .refine(
                (url) => /^(https?:\/\/)/i.test(url),
                `${fieldName} must start with http:// or https://.`,
            );
    }
};

// Utility for creating Port validation with more meaningful error messages
export const requiredPort = () =>
    z
        .number({
            required_error: "Port is required.",
            invalid_type_error: "Port must be a valid number.",
        })
        .refine((val) => val > 0 && val <= 65535, {
            message: "Port must be between 1 and 65535.",
        });

// Utility for enum validation with improved error messages
export const requiredEnum = <T extends [string, ...string[]]>(values: [...T], fieldName: string) =>
    z.enum(values, {
        required_error: `${fieldName} is required.`,
        invalid_type_error: `${fieldName} must be one of ${values.join(", ")}.`,
    });

// ==================== User =============== //
// Utility for string fields with length limits and better error handling
export const stringField = (min: number, max: number, name: string) =>
    z
        .string({
            required_error: `${name} is required.`,
            invalid_type_error: `${name} must be a valid string.`,
        })
        .trim()
        .min(min, `${name} must be at least ${min} characters.`)
        .max(max, `${name} cannot exceed ${max} characters.`);
export const slugField = () => z.string().regex(/^[a-z0-9-]+$/);
// Enhanced email validation schema with stricter rules
export const emailField = () => {
    return z.string().email().trim().min(1, "Email cannot be empty.");
};

// Enhanced username validation schema
export const usernameField = () => {
    return z
        .string()
        .min(3, "Username must be at least 3 characters long.")
        .max(20, "Username cannot exceed 20 characters.")
        .regex(
            /^[a-zA-Z0-9_-]+$/,
            "Username can only contain letters, numbers, underscores, and hyphens.",
        )
        .refine(
            (username) => username.trim() !== "",
            "Username cannot be empty or just whitespace.",
        );
};

// Password validation with stricter rules (including uppercase, lowercase, digit, special character)
export const passwordField = () =>
    z
        .string()
        .min(8, "Password must be at least 8 characters long.")
        .max(255, "Password is too long.")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
        .regex(/[0-9]/, "Password must contain at least one digit.")
        .regex(/[@$!%*?&]/, "Password must contain at least one special character.");

// Utility for number fields with minimum validation and better error messages
export const numberField = (min: number, fieldName: string) =>
    z
        .number({
            required_error: `${fieldName} is required.`,
            invalid_type_error: `${fieldName} must be a valid number.`,
        })
        .min(min, `${fieldName} cannot be less than ${min}.`);

// Utility for optional URL field with better error handling
export const urlField = () =>
    z
        .string()
        .url("Must be a valid URL.")
        .optional()
        .refine(
            (url) => !url || /^(https?:\/\/)/i.test(url),
            "If provided, URL must start with http:// or https://.",
        );

// ==================== New Utilities =============== //
// Utility for validating an integer (positive) field
export const positiveInteger = (fieldName: string) =>
    z
        .number({
            required_error: `${fieldName} is required.`,
            invalid_type_error: `${fieldName} must be a valid number.`,
        })
        .int(`${fieldName} must be an integer.`)
        .positive(`${fieldName} must be a positive number.`);

// Utility for validating a phone number (simple format)
export const phoneNumberField = () =>
    z
        .string()
        .regex(/^\+?[1-9]\d{1,14}$/, "Phone number must be in E.164 format (e.g., +1234567890).");

// Utility for date validation
export const dateField = (fieldName: string) =>
    z
        .string({
            required_error: `${fieldName} is required.`,
            invalid_type_error: `${fieldName} must be a valid string.`,
        })
        .refine(
            (val) => !isNaN(Date.parse(val)),
            `${fieldName} must be a valid date in YYYY-MM-DD format.`,
        );

// Utility for strong password confirmation validation
// export const passwordConfirmationField = (passwordField: z.ZodString) =>
//     z
//         .string({
//             required_error: "Password confirmation is required.",
//         })
//         .refine(
//             (value) => value === String(passwordField),
//             "Password confirmation does not match the original password.",
//         );

// Utility for strong password confirmation validation
export const passwordConfirmationField = () =>
    z.string({
        required_error: "Password confirmation is required.",
    });

// Utility for enum validation with default value support
export const enumField = <T extends string>(
    values: readonly [T, ...T[]],
    fieldName: string,
    defaultValue?: T,
) => {
    const enumSchema = z
        .enum(values, {
            required_error: `${fieldName} is required.`,
            invalid_type_error: `${fieldName} must be one of ${values.join(", ")}.`,
        })
        .openapi({
            example: values[0],
            description: `${fieldName} must be in [${values}]`,
        });

    // If defaultValue is provided, return schema with default
    if (defaultValue) {
        return enumSchema.default(defaultValue);
    }

    // Return schema without default if not provided
    return enumSchema;
};
