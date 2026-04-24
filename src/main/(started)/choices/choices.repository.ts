import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { HelperTx } from "@type/index";
import { CreateUserChoiceDto } from "../user-choice/dto/user-choice.dto";
import { UserChoiceRepository } from "../user-choice/user-choice.repository";
import { CreateChoiceDto } from "./dto/choices.create.dto";

@Injectable()
export class ChoicesRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly userChoiceRepository: UserChoiceRepository,
    ) {}

    /**
     * Find a choice by its slug
     */
    async findBySlug(tx: HelperTx, slug: string) {
        return await tx.choice.findUnique({ where: { slug } });
    }
    /**
     * Create a choice
     */
    async create(tx: HelperTx, input: CreateChoiceDto) {
        return await tx.choice.create({
            data: {
                text: input.text,
                slug: input.slug!,
            },
        });
    }
    /**
     * Create multiple choices + user-choice relations
     * Ensures uniqueness per user
     */
    async createMany(data: CreateUserChoiceDto["ids"], userId: string) {
        return await this.prisma.$transaction(async (tx) => {
            const choices: Record<string, any> = [];
            for (const item of data) {
                const isNotExist = await tx.choice.findFirst({ where: { id: item } });
                if (!isNotExist) throw new NotFoundException("Choice not found with that ID!");

                const createdUserChoice = await tx.userChoice.upsert({
                    where: {
                        userId_choiceId: {
                            choiceId: isNotExist.id,
                            userId,
                        },
                    },
                    update: {
                        userId,
                        choiceId: isNotExist.id,
                    },
                    create: {
                        userId,
                        choiceId: isNotExist.id,
                    },
                    select: {
                        choice: true,
                    },
                });
                choices.push(createdUserChoice.choice);
            }
            return choices;
        });
    }

    async findManyByUserId(userId: CreateChoiceDto["userId"]) {
        return await this.prisma.choice.findMany({
            where: {
                UserChoice: {
                    some: { userId },
                },
            },
        });
    }

    // async delete(userId: string, slug: string) {
    //   return await this.prisma.$transaction(async (tx) => {
    //     const choice = await this.findBySlug(tx, slug);
    //     if (!choice) throw new NotFoundException(`Choice '${slug}' not found`);

    //     await this.userChoiceRepository.delete(tx, {
    //       choiceId: choice.id,
    //     }, userId);
    //   });
    // }

    async findMany() {
        return await this.prisma.choice.findMany({
            include: {
                UserChoice: {
                    include: {
                        choice: true,
                        user: true,
                    },
                },
            },
        });
    }
}
