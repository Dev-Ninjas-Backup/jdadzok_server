import { PrismaService } from "@lib/prisma/prisma.service";
import { HttpException, Injectable } from "@nestjs/common";
import { CreateAdminActivity } from "./dto/createadminActivity.dto";

@Injectable()
export class SettingRepository {
    constructor(private readonly prisma: PrismaService) {}

    async postCaplevelData(scoreData: CreateAdminActivity) {
        try {
            // if the activity score table is exist then we don't need to create just update this
            const isExist = await this.prisma.activityScore.findFirst();
            if (isExist) {
                const response = await this.prisma.activityScore.update({
                    where: {
                        id: isExist.id,
                    },
                    data: {
                        ...scoreData,
                    },
                });
                return {
                    message: "updated successfully",
                    data: response,
                };
            } else {
                const response = await this.prisma.activityScore.create({
                    data: {
                        ...scoreData,
                    },
                });
                return {
                    message: "created successfully",
                    data: response,
                };
            }
        } catch (error) {
            throw new HttpException(error.message, error.status);
        }
    }

    async getCapLevelData() {
        try {
            const response = await this.prisma.activityScore.findFirst();
            return {
                message: "Score fetch success",
                data: response,
            };
        } catch (error) {
            throw new HttpException(error.message, error.status);
        }
    }
}
