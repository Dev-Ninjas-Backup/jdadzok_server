import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { EventQueryDto } from "../dto/eventQuery.dto";
import { Prisma } from "@prisma/client";

@Injectable()
export class EventService {
    constructor(private readonly prisma: PrismaService) {}

    async getOverview() {
        const now = new Date();
        const totalProject = await this.prisma.volunteerProject.count();
        const upcoming = await this.prisma.volunteerProject.count({
            where: {
                startDate: {
                    gt: now,
                },
            },
        });
        const ongoing = await this.prisma.volunteerProject.count({
            where: {
                startDate: { lte: now },
                endDate: { gte: now },
            },
        });
        const pendingApproval = await this.prisma.volunteerProject.count({
            where: {
                applications: {
                    some: {
                        status: "PENDING",
                    },
                },
            },
        });

        return {
            totalProject,
            upcoming,
            ongoing,
            pendingApproval,
        };
    }

    private getStatus(project: any): string {
        const now = new Date();

        if (project.startDate && project.startDate > now) return "Upcoming";
        if (
            project.startDate &&
            project.endDate &&
            project.startDate <= now &&
            project.endDate >= now
        )
            return "Ongoing";
        if (project.endDate && project.endDate < now) return "Completed";

        return "Pending";
    }

    // ---------- LIST PROJECTS WITH SEARCH ----------
    async listEvents(dto: EventQueryDto) {
        const { search, page = 1, limit = 10 } = dto;

        const skip = (page - 1) * limit;

        const where: Prisma.VolunteerProjectWhereInput | undefined = search
            ? {
                  OR: [
                      {
                          title: {
                              contains: search,
                              mode: Prisma.QueryMode.insensitive,
                          },
                      },
                      {
                          ngo: {
                              profile: {
                                  name: {
                                      contains: search,
                                      mode: Prisma.QueryMode.insensitive,
                                  },
                              },
                          },
                      },
                  ],
              }
            : undefined;

        // Fetch paginated data + total count
        const [events, total] = await this.prisma.$transaction([
            this.prisma.volunteerProject.findMany({
                where,
                include: {
                    ngo: { include: { profile: true } },
                    applications: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),

            this.prisma.volunteerProject.count({ where }),
        ]);

        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: this.formatEvents(events),
        };
    }

    private formatEvents(events: any[]) {
        return events.map((event) => {
            const approved = event.applications.filter((a: any) => a.status === "APPROVED").length;

            return {
                id: event.id,
                title: event.title,
                community: event.ngo?.profile?.name || "Unknown NGO",
                date: event.startDate,
                location: event.location,
                participants: `${approved}/200`,
                status: this.getStatus(event),
            };
        });
    }
}
