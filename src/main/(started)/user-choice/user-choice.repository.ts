import { Injectable } from "@nestjs/common";

@Injectable()
export class UserChoiceRepository {
    // async findUnique(tx: HelperTx, input: CreateUserChoiceDto, userId: string) {
    //   return await tx.userChoice.findUnique({
    //     where: {
    //       userId_choiceId: {
    //         userId,
    //         choiceId: input.choiceId
    //       }
    //     },
    //   });
    // }
    // async create(tx: HelperTx, input: CreateUserChoiceDto, userId: string) {
    //   const createdUserChoice = await tx.userChoice.create({
    //     data: {
    //       userId,
    //       choiceId: input.choiceId
    //     },
    //     include: { user: true, choice: true }
    //   });
    //   console.log('created user choice: ', createdUserChoice);
    //   return createdUserChoice
    // }
    // async upsert(tx: HelperTx, input: CreateUserChoiceDto, userId: string) {
    //   return await tx.userChoice.upsert({
    //     where: {
    //       userId_choiceId: {
    //         userId,
    //         choiceId: input.choiceId
    //       },
    //     },
    //     update: {},
    //     create: {
    //       choiceId: input.choiceId,
    //       userId
    //     }
    //   });
    // }
    // async delete(tx: HelperTx, where: CreateUserChoiceDto, userId: string) {
    //   return await tx.userChoice.delete({
    //     where: {
    //       userId_choiceId: {
    //         choiceId: where.choiceId,
    //         userId
    //       },
    //     },
    //   });
    // }
}
