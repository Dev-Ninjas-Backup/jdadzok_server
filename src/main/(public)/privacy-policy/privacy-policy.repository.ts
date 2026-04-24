import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreatePrivacyPolicyDto, UpdatePrivacyPolicyDto } from "./dto/privacy-policy.dto";

@Injectable()
export class PrivacyPolicyRepository {
    constructor(private readonly prisma: PrismaService) {}

    async find() {
        return this.prisma.privacyPolicy.findFirst();
    }

    async create(input: CreatePrivacyPolicyDto) {
        return this.prisma.privacyPolicy.create({
            data: {
                text: input.text,
            },
        });
    }

    async update(input: UpdatePrivacyPolicyDto) {
        const existing = await this.find();
        if (!existing) {
            return this.create(input as CreatePrivacyPolicyDto);
        }
        return this.prisma.privacyPolicy.update({
            where: { id: existing.id },
            data: {
                text: input.text,
            },
        });
    }
}
