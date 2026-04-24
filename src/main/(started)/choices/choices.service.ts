import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateUserChoiceDto } from "../user-choice/dto/user-choice.dto";
import { ChoicesRepository } from "./choices.repository";

@Injectable()
export class ChoicesService {
    constructor(private readonly choicesRepo: ChoicesRepository) {}

    async assignChoices(dtos: CreateUserChoiceDto, userId: string) {
        // Check if the user is trying to select more than 5 choices
        if (dtos.ids.length > 5) {
            throw new BadRequestException("You can select at most 5 choices.");
        }

        const choice = await this.choicesRepo.createMany(dtos.ids, userId);
        return choice;
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
