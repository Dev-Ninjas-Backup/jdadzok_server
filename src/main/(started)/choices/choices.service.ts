import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import {
    OTHER_CHOICE_SLUG,
    resolveOtherText,
} from "@common/utils/other-option.util";
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

        const selected = await this.prisma.choice.findMany({
            where: { id: { in: dtos.ids } },
            select: { id: true, slug: true },
        });
        if (selected.length !== dtos.ids.length) {
            throw new NotFoundException("One or more choices were not found");
        }

        const selectedOther = selected.some((c) => c.slug === OTHER_CHOICE_SLUG);
        const interestOtherText = resolveOtherText({
            isOther: selectedOther,
            otherText: dtos.interestOtherText,
            label: "interestOtherText",
        });

        const choices = await this.choicesRepo.createMany(dtos.ids, userId);

        const profile = await this.prisma.profile.findFirst({ where: { userId } });
        if (!profile) {
            throw new NotFoundException("User profile not found!");
        }

        const profileUpdate: {
            isVolunteerMentorOptIn?: boolean;
            interestOtherText: string | null;
        } = {
            interestOtherText,
        };

        let isVolunteerMentorOptIn: boolean | undefined;
        if (typeof dtos.isVolunteerMentorOptIn === "boolean") {
            profileUpdate.isVolunteerMentorOptIn = dtos.isVolunteerMentorOptIn;
            isVolunteerMentorOptIn = dtos.isVolunteerMentorOptIn;
        }

        await this.prisma.profile.update({
            where: { userId },
            data: profileUpdate,
        });

        return {
            choices,
            interestOtherText,
            ...(typeof isVolunteerMentorOptIn === "boolean" && { isVolunteerMentorOptIn }),
        };
    }

    async getUserChoices(userId: string) {
        const [choices, profile] = await Promise.all([
            this.choicesRepo.findManyByUserId(userId),
            this.prisma.profile.findFirst({
                where: { userId },
                select: { interestOtherText: true },
            }),
        ]);

        return {
            choices,
            interestOtherText: profile?.interestOtherText ?? null,
        };
    }

    async findMany() {
        return await this.choicesRepo.findMany();
    }
}
