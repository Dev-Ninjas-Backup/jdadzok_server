import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreateReportDto } from "./dto/report.dto";

@Injectable()
export class ReportService {
    constructor(private prisma: PrismaService) {}

    async createReport(userId: string, dto: CreateReportDto) {
        return this.prisma.report.create({
            data: {
                reporterId: userId,
                targetType: dto.targetType,
                targetId: dto.targetId,
                reason: dto.reason,
                description: dto.description || null,
            },
        });
    }

    async getReportsByUser(userId: string) {
        return this.prisma.report.findMany({
            where: { reporterId: userId },
            include: {
                reporter: {
                    select: {
                        id: true,
                        profile: { select: { username: true, name: true, avatarUrl: true } },
                    },
                },
            },
        });
    }
}
