import { HandleError } from "@common/error/handle-error.decorator";
import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EVENT_TYPES } from "@common/interface/events-name";
import { CapLevelEvent } from "@common/interface/events-payload";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { MaintenanceSettingsDto } from "../dto/maintenance.dto";
import { PlatformInformationDto } from "../dto/platform-information.dto";
import { UpdateCapLevelQueryDto } from "../dto/updateCapLevelQuery.dto";
@Injectable()
export class AdminSettingsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
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

    // --------------------------------update maintenance settings------------------

    @HandleError("Failed to update maintenance settings")
    async updateMaintenanceSettings(dto: MaintenanceSettingsDto) {
        // Ensure table has only one row
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

    // -------------------get maintenance settings------------------
    async getMaintenanceSettings() {
        const settings = await this.prisma.maintenanceModel.findFirst();
        return { settings };
    }
    // ---------------------getPlatformSettings-------------
    async getPlatformSettings() {
        const settings = await this.prisma.platformInformation.findFirst();
        return { settings };
    }
    // ----------------------------
    // notify user caplevel update specific user------------------
    @HandleError("Failed to update user caplevel")
    async updateCaplevel(userId: string, dto: UpdateCapLevelQueryDto) {
        const { targetLevel, bypassVerification } = dto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new NotFoundException("User is Not Found.");
        }
        if (!targetLevel) {
            throw new BadRequestException("targetLevel is required");
        }

        const validLevels = ["NONE", "GREEN", "YELLOW", "RED", "BLACK", "OSTRICH_FEATHER"] as const;

        if (!validLevels.includes(targetLevel as any)) {
            throw new BadRequestException(`Invalid CapLevel: ${targetLevel}`);
        }

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                capLevel: targetLevel,
            },
        });

        // ---------- notification now ------------------
        // Only send notification to the specific user whose caplevel was changed
        const recipient = { id: user.id, email: user.email };
        const oldLevel = user.capLevel;

        // console.log(newLevel);
        //---------- Save notification for this specific user ------------
        await this.prisma.notification.create({
            data: {
                title: `CapLevel Updated: ${oldLevel} → ${targetLevel}`,
                message: `Your CapLevel has been changed from ${oldLevel} to ${targetLevel}`,
                userId: user.id,
                type: "SYSTEM",
            },
        });
        console.info("notification", Notification);

        // Emit event only to this specific user
        const payload: CapLevelEvent = {
            action: "CREATE",
            meta: {
                postId: userId,
                performedBy: userId,
                publishedAt: new Date(),
            },
            info: {
                title: `CapLevel Updated: ${oldLevel} → ${targetLevel}`,
                message: `Your CapLevel has been changed from ${oldLevel} to ${targetLevel}`,
                authorId: userId,
                caplevelDetials: [{ oldLevel, newLevel: targetLevel }],
                recipients: [recipient],
            },
        };

        // console.log("the payload", payload);
        this.eventEmitter.emit(EVENT_TYPES.CAPLEVEL_CREATE, payload);

        return {
            message: "User CapLevel updated",
            userId,
            newLevel: targetLevel,
            bypassVerification: bypassVerification ?? false,
        };
    }
}
