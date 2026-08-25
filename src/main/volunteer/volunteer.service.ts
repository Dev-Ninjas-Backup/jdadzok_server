import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
    Logger,
} from "@nestjs/common";
import { CreateVolunteerProjectDto } from "./dto/create-volunteer-project.dto";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ApplyVolunteerDto } from "./dto/apply-volunteer.dto";
import { LogHoursDto } from "./dto/log-hours.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import { ApplicationStatus, ContributionType, Role, VolunteerHourSource, VolunteerHourVerificationStatus } from "@prisma/client";
import { ChatService } from "@module/(sockets)/chats/chat.service";
import {
    isContributionOther,
    resolveOtherText,
} from "@common/utils/other-option.util";
import { requiresCounterpartyConfirmation } from "@common/utils/volunteer-hour.util";
import { SearchSyncService } from "@module/(search)/search-sync.service";

@Injectable()
export class VolunteerService {
    private readonly logger = new Logger(VolunteerService.name);

    constructor(
        private prisma: PrismaService,
        private readonly chatService: ChatService,
        private readonly searchSync: SearchSyncService,
    ) {}

    async createProject(dto: CreateVolunteerProjectDto, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ForbiddenException("Unauthorized Access");

        const ngo = await this.prisma.ngo.findUnique({ where: { id: dto.ngoId } });
        if (!ngo) throw new NotFoundException("NGO is not found");

        if (user.id != ngo.ownerId)
            throw new ForbiddenException("Only NGO owner can create projects");

        const project = await this.prisma.volunteerProject.create({
            data: { ...dto, createdById: userId, ngoId: dto.ngoId },
        });

        await this.safeSearchUpsert(project.id);
        return project;
    }

    async getAllNgoProjects(userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException("User is not found");
        const projects = await this.prisma.volunteerProject.findMany({});
        return projects;
    }

    async getNgoProjects(userId: string) {
        return this.prisma.volunteerProject.findMany({
            where: { createdById: userId },
            include: { applications: true },
        });
    }

    async applyToProject(dto: ApplyVolunteerDto, userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { profile: { select: { isVolunteerMentorOptIn: true } } },
        });
        if (user?.role !== Role.USER)
            throw new ForbiddenException("Only regular volunteers can apply");

        if (!user.profile?.isVolunteerMentorOptIn) {
            throw new ForbiddenException(
                "Volunteer / mentor opt-in is required before applying to projects. Enable it from onboarding or your profile.",
            );
        }

        const existing = await this.prisma.volunteerApplication.findFirst({
            where: { projectId: dto.projectId, volunteerId: userId },
        });
        if (existing) throw new BadRequestException("You already applied to this project");
        const project = await this.prisma.volunteerProject.findUnique({
            where: { id: dto.projectId },
            include: {
                ngo: {
                    include: { owner: true },
                },
            },
        });
        if (!project) {
            throw new BadRequestException("sorry, this volunteer project does not exist.");
        }
        if (project.ngo.owner.id === userId) {
            throw new BadRequestException("You cannot apply to volunteer in your own NGO project.");
        }
        return this.prisma.volunteerApplication.create({
            data: { projectId: dto.projectId, volunteerId: userId },
        });
    }

    async getProjectApplications(projectId: string, userId: string) {
        // get the project and verify ownership
        const project = await this.prisma.volunteerProject.findUnique({
            where: { id: projectId },
        });

        if (!project) throw new NotFoundException("Project not found");
        if (project.createdById !== userId)
            throw new ForbiddenException(
                "You are not authorized to view applications for this project",
            );

        // fetch all applications for this project
        const applications = await this.prisma.volunteerApplication.findMany({
            where: { projectId },
            include: {
                volunteer: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return {
            totalApplications: applications.length,
            applications,
        };
    }

    async logHours(applicationId: string, dto: LogHoursDto, userId: string) {
        const profile = await this.prisma.profile.findFirst({
            where: { userId },
            select: { isVolunteerMentorOptIn: true },
        });
        if (!profile?.isVolunteerMentorOptIn) {
            throw new ForbiddenException(
                "Volunteer / mentor opt-in is required to log verified hours. Enable it from your profile.",
            );
        }

        const app = await this.prisma.volunteerApplication.findUnique({
            where: { id: applicationId },
        });

        if (!app) {
            throw new NotFoundException("Application not found");
        }

        if (app.volunteerId !== userId) {
            throw new ForbiddenException("You can only log hours for your own application");
        }

        if (app.status !== "ACCEPTED") {
            throw new BadRequestException(
                "You can only log hours after your application has been accepted by the NGO.",
            );
        }

        const checkIn = new Date(dto.checkInTime);
        const checkOut = new Date(dto.checkOutTime);

        if (checkOut <= checkIn) {
            throw new BadRequestException("Check-out time must be after check-in time.");
        }

        const contributionOther = resolveOtherText({
            isOther: isContributionOther(dto.contributionType),
            otherText: dto.contributionOther,
            label: "contributionOther",
        });

        if (requiresCounterpartyConfirmation(dto.contributionType)) {
            if (!dto.counterpartyUserId?.trim()) {
                throw new BadRequestException(
                    "counterpartyUserId (mentee / recipient) is required for MENTORING and ADVICE contributions.",
                );
            }
            if (dto.counterpartyUserId === userId) {
                throw new BadRequestException("You cannot list yourself as the counterparty.");
            }
            const counterparty = await this.prisma.user.findUnique({
                where: { id: dto.counterpartyUserId },
                select: { id: true },
            });
            if (!counterparty) {
                throw new NotFoundException("Counterparty user not found");
            }
        }

        // Calculate hours (rounded to 2 decimals)
        const hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        const totalHours = app.workedHours + hoursWorked;

        if (totalHours > 352) {
            throw new BadRequestException(
                "You cannot exceed a total of 352 working hours for this project.",
            );
        }

        // Update total worked hours and record a detailed log
        return this.prisma.$transaction([
            this.prisma.volunteerApplication.update({
                where: { id: applicationId },
                data: { workedHours: totalHours },
            }),
            this.prisma.volunteerHour.create({
                data: {
                    applicationId,
                    loggedByUserId: userId,
                    counterpartyUserId: requiresCounterpartyConfirmation(dto.contributionType)
                        ? dto.counterpartyUserId
                        : null,
                    hours: hoursWorked,
                    contributionType: dto.contributionType,
                    contributionOther,
                    note: `Worked from ${checkIn.toISOString()} to ${checkOut.toISOString()}`,
                    source: VolunteerHourSource.SELF_REPORT,
                    verificationStatus: VolunteerHourVerificationStatus.PENDING,
                    isVerified: false,
                },
            }),
        ]);
    }

    async updateStatus(applicationId: string, dto: UpdateStatusDto, userId: string) {
        const app = await this.prisma.volunteerApplication.findUnique({
            where: { id: applicationId },
            include: { project: true },
        });
        if (!app) throw new NotFoundException("Application not found");
        if (app.project.createdById !== userId)
            throw new ForbiddenException("Only NGO owner can confirm completion");

        const updated = await this.prisma.volunteerApplication.update({
            where: { id: applicationId },
            data: {
                status: dto.status,
                completionNote: dto.completionNote,
                confirmedById: userId,
            },
        });

        if (dto.status === ApplicationStatus.ACCEPTED) {
            await this.chatService.openMentorshipChatForApplication(applicationId);
        }

        return updated;
    }

    async getVolunteerApplications(userId: string) {
        return this.prisma.volunteerApplication.findMany({
            where: { volunteerId: userId },
            include: { project: true },
        });
    }

    listContributionTypes() {
        return {
            types: Object.values(ContributionType).map((value) => ({
                value,
                requiresOtherText: value === ContributionType.OTHER,
                requiresCounterparty: requiresCounterpartyConfirmation(value),
            })),
            otherPattern:
                "When type is OTHER, send free-text in contributionOther (same pattern as interests / Bridge).",
            counterpartyPattern:
                "When type is MENTORING or ADVICE, send counterpartyUserId (mentee / recipient). They must confirm before Cap credit.",
        };
    }

    async removeProject(projectId: string, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException("Unauthorized Access");

        const project = await this.prisma.volunteerProject.findUnique({
            where: { id: projectId, createdById: userId },
        });
        if (!project) throw new NotFoundException("Project is not found");

        await this.prisma.volunteerProject.delete({
            where: { id: projectId, createdById: userId },
        });
        await this.safeSearchDelete(projectId);
        return "null";
    }

    private async safeSearchUpsert(projectId: string) {
        try {
            await this.searchSync.upsertOpportunity(projectId);
        } catch (err) {
            this.logger.warn(`Search upsert failed for opportunity ${projectId}: ${String(err)}`);
        }
    }

    private async safeSearchDelete(projectId: string) {
        try {
            await this.searchSync.deleteOpportunity(projectId);
        } catch (err) {
            this.logger.warn(`Search delete failed for opportunity ${projectId}: ${String(err)}`);
        }
    }
}
