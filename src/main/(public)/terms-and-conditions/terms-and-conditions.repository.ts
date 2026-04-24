import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import {
    CreateTermsAndConditionsDto,
    UpdateTermsAndConditionsDto,
} from "./dto/terms-and-conditions.dto";

@Injectable()
export class TermsAndConditionsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async find() {
        return this.prisma.termsAndConditions.findFirst();
    }

    async create(input: CreateTermsAndConditionsDto) {
        return this.prisma.termsAndConditions.create({
            data: {
                text: input.text,
            },
        });
    }

    async update(input: UpdateTermsAndConditionsDto) {
        const existing = await this.find();
        if (!existing) {
            return this.create(input as CreateTermsAndConditionsDto);
        }
        return this.prisma.termsAndConditions.update({
            where: { id: existing.id },
            data: {
                text: input.text,
            },
        });
    }
}
