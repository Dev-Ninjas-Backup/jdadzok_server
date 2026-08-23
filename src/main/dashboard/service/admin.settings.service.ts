import { HandleError } from "@common/error/handle-error.decorator";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CapLevelPromotionService } from "@module/(core)/cap-level/cap-level-promotion.service";
import { MaintenanceSettingsDto } from "../dto/maintenance.dto";
import { PlatformInformationDto } from "../dto/platform-information.dto";
import { UpdateCapLevelQueryDto } from "../dto/updateCapLevelQuery.dto";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Role } from "@prisma/client";

@Injectable()
export class AdminSettingsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly capLevelPromotionService: CapLevelPromotionService,
    ) {}

    // ---------------admin platform info-----------------------
    @HandleError("Failed to update platform information")
    async updatePlatformInfo(dto: PlatformInformationDto) {
        const platformInfo = await this.prisma.platformInformation.findFirst();

        if (!platformInfo) {
            return this.prisma.platformInformation.create({
                data: {
                    platformName: dto.platformName ?? null,
                    supportEmail: dto.supportEmail ?? null,
                    platformUrl: dto.platformUrl ?? null,
                },
            });
        }

        return this.prisma.platformInformation.update({
            where: { id: platformInfo.id },
            data: {
                platformName: dto.platformName ?? null,
                supportEmail: dto.supportEmail ?? null,
                platformUrl: dto.platformUrl ?? null,
            },
        });
    }

    @HandleError("Failed to update maintenance settings")
    async updateMaintenanceSettings(dto: MaintenanceSettingsDto) {
        let settings = await this.prisma.maintenanceModel.findFirst();

        if (!settings) {
            settings = await this.prisma.maintenanceModel.create({
                data: {
                    maxEventsPerCommunity: dto.maxEventsPerCommunity ?? null,
                    MaxPostPerDay: dto.MaxPostPerDay ?? null,
                },
            });
            return { message: "Maintenance settings created", settings };
        }

        const updated = await this.prisma.maintenanceModel.update({
            where: { id: settings.id },
            data: {
                maxEventsPerCommunity: dto.maxEventsPerCommunity ?? settings.maxEventsPerCommunity,
                MaxPostPerDay: dto.MaxPostPerDay ?? settings.MaxPostPerDay,
            },
        });

        return {
            message: "Maintenance settings updated successfully",
            settings: updated,
        };
    }

    async getMaintenanceSettings() {
        const settings = await this.prisma.maintenanceModel.findFirst();
        return { settings };
    }

    async getPlatformSettings() {
        const settings = await this.prisma.platformInformation.findFirst();
        return { settings };
    }

    @HandleError("Failed to update user caplevel")
    async updateCaplevel(actorId: string, userId: string, dto: UpdateCapLevelQueryDto) {
        const { targetLevel, bypassVerification, bypassReason, reviewNotes } = dto;

        if (!targetLevel) {
            throw new BadRequestException("targetLevel is required");
        }

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException("User is Not Found.");
        }

        return this.capLevelPromotionService.promoteUser(
            actorId,
            userId,
            {
                targetLevel,
                bypassVerification,
                bypassReason,
                reviewNotes,
            },
            Role.SUPER_ADMIN,
        );
    }
}
