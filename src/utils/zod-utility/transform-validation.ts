import { BadRequestException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

/**
 * Generic helper to validate and transform plain object into a class instance.
 * @param dtoClass - The class (DTO) type to transform and validate.
 * @param plainObject - The input object (plain JSON).
 * @returns The validated instance of the DTO.
 * @throws BadRequestException if validation fails.
 */
export async function transformAndValidate<T extends object>(
    dtoClass: new (...args: any[]) => T,
    plainObject: unknown,
): Promise<T> {
    // Transform plain JSON to class instance
    const dtoInstance = plainToInstance(dtoClass, plainObject, {
        enableImplicitConversion: true,
    });

    // Validate the instance
    const errors = await validate(dtoInstance, {
        whitelist: true, // removes extra fields
        forbidNonWhitelisted: true, // throws error for extra fields
        skipMissingProperties: false,
    });

    if (errors.length > 0) {
        const message = errors
            .map((err) => Object.values(err.constraints ?? {}).join(", "))
            .join("; ");
        throw new BadRequestException({
            success: false,
            message,
        });
    }

    return dtoInstance;
}
