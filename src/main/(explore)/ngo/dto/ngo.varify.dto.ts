import { IdentityVerificationType } from "@prisma/client";
import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsEnum, IsUrl } from "class-validator";

export class VerifyNgoDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsUrl({}, { each: true })
    @Type(() => String)
    documents: string[];

    @IsEnum(IdentityVerificationType)
    verificationType: IdentityVerificationType;
}
