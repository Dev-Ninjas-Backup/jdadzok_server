import {
    Injectable,
    ForbiddenException,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common";
import { CreateVolunteerProjectDto } from "./dto/create-volunteer-project.dto";
import { PrismaService } from "@lib/prisma/prisma.service";
import { ApplyVolunteerDto } from "./dto/apply-volunteer.dto";
import { ApplicationStatus, ContributionType, Role, VolunteerHourSource, VolunteerHourVerificationStatus } from "@prisma/client";
import { LogHoursDto } from "./dto/log-hours.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";
import {
    isContributionOther,
    resolveOtherText,
} from "@common/utils/other-option.util";
@Injectable()
export class VolunteerService {
    constructor(private prisma: PrismaService) {}

    async createProject(dto: CreateVolunteerProjectDto, userId: string) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ForbiddenException("Unauthorized Access");

        const ngo = await this.prisma.ngo.findUnique({ where: { id: dto.ngoId } });
        if (!ngo) throw new NotFoundException("NGO is not found");

        if (user.id != ngo.ownerId)
            throw new ForbiddenException("Only NGO owner can create projects");

        return this.prisma.volunteerProject.create({
            data: { ...dto, createdById: userId, ngoId: dto.ngoId },
        });
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
            })),
            otherPattern:
                "When type is OTHER, send free-text in contributionOther (same pattern as interests / Bridge).",
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
        return "null";
    }
}
