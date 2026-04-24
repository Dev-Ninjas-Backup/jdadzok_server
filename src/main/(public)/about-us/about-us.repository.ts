import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateAboutUsDto, UpdateAboutUsDto } from "./dto/about-us.dto";

@Injectable()
export class AboutUsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async find() {
        // Returns the first record, or null if none
        return this.prisma.aboutUs.findFirst();
    }

    async create(input: CreateAboutUsDto) {
        return this.prisma.aboutUs.create({
            data: {
                photos: input.photos ?? [],
                about: input.about,
            },
        });
    }

    async update(input: UpdateAboutUsDto) {
        // Update the first record (only one expected)
        const existing = await this.find();
        if (!existing) {
            // Create if not exists
            return this.create({
                ...input,
                about: input.about!,
            });
        }
        return this.prisma.aboutUs.update({
            where: { id: existing.id },
            data: {
                photos: input.photos,
                about: input.about,
            },
        });
    }
}
