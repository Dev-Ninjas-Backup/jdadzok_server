import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodType } from "zod";

export class ZodValidationPipe implements PipeTransform {
    constructor(private readonly schema: ZodType) {}

    transform(value: any) {
        const { data, error, success } = this.schema.safeParse(value);
        if (!success) {
            throw new BadRequestException(error);
        }
        return data;
    }
}
