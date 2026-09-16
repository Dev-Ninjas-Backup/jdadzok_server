import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { GetVolunteerApplicationsQueryDto } from "../dto/volunteerApplicationQuery.dto";

@Injectable()
export class VolunteerApplicationService {
    constructor(private readonly prisma: PrismaService) {}

    async listApplications(dto: GetVolunteerApplicationsQueryDto) {
        const { status, projectId, search, page = 1, limit = 10 } = dto;
        const skip = (page - 1) * limit;

        const where: Prisma.VolunteerApplicationWhereInput = {
            ...(status ? { status } : {}),
            ...(projectId ? { projectId } : {}),
            ...(search
                ? {
                      OR: [
                          {
                              volunteer: {
                                  email: { contains: search, mode: Prisma.QueryMode.insensitive },
                              },
                          },
                          {
                              project: {
                                  title: { contains: search, mode: Prisma.QueryMode.insensitive },
                              },
                          },
                      ],
                  }
                : {}),
        };

        const [applications, total] = await this.prisma.$transaction([
            this.prisma.volunteerApplication.findMany({
                where,
                include: {
                    volunteer: { select: { id: true, email: true } },
                    project: { select: { id: true, title: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            this.prisma.volunteerApplication.count({ where }),
        ]);

        return {
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            data: applications,
        };
    }
}
