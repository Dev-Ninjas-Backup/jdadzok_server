import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CreateUserChoiceDto } from "../user-choice/dto/user-choice.dto";
import { ChoicesRepository } from "./choices.repository";

@Injectable()
export class ChoicesService {
    constructor(
        private readonly choicesRepo: ChoicesRepository,
        private readonly prisma: PrismaService,
    ) {}

    async assignChoices(dtos: CreateUserChoiceDto, userId: string) {
        // Check if the user is trying to select more than 5 choices
        if (dtos.ids.length > 5) {
            throw new BadRequestException("You can select at most 5 choices.");
        }

        const choices = await this.choicesRepo.createMany(dtos.ids, userId);

        let isVolunteerMentorOptIn: boolean | undefined;
        if (typeof dtos.isVolunteerMentorOptIn === "boolean") {
            const existing = await this.prisma.profile.findFirst({ where: { userId } });
            if (!existing) {
                throw new NotFoundException("User profile not found!");
            }
            const profile = await this.prisma.profile.update({
                where: { userId },
                data: { isVolunteerMentorOptIn: dtos.isVolunteerMentorOptIn },
                select: { isVolunteerMentorOptIn: true },
            });
            isVolunteerMentorOptIn = profile.isVolunteerMentorOptIn;
        }

        return {
            choices,
            ...(typeof isVolunteerMentorOptIn === "boolean" && { isVolunteerMentorOptIn }),
        };
    }

    async getUserChoices(userId: string) {
        return this.choicesRepo.findManyByUserId(userId);
    }

    // async removeChoice(userId: string, slug: string) {
    //   return this.choicesRepo.delete(userId, slug);
    // }
    async findMany() {
        return await this.choicesRepo.findMany();
    }
}
