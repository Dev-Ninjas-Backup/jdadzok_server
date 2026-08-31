import { PrismaService } from "@lib/prisma/prisma.service";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {
    Prisma,
    TrainingCohortStatus,
    TrainingCourseStatus,
    TrainingEnrollmentStatus,
} from "@prisma/client";
import {
    CreateTrainingCohortDto,
    CreateTrainingCourseDto,
    EnrollTrainingCohortDto,
    TrainingCourseListQueryDto,
    UpdateTrainingCourseDto,
} from "./dto/training.dto";

@Injectable()
export class TrainingService {
    constructor(private readonly prisma: PrismaService) {}

    async createCourse(instructorId: string, dto: CreateTrainingCourseDto) {
        return this.prisma.trainingCourse.create({
            data: {
                instructorId,
                title: dto.title,
                description: dto.description,
                skills: dto.skills ?? [],
                price: dto.price,
                currency: dto.currency ?? "USD",
                status: dto.status ?? TrainingCourseStatus.DRAFT,
            },
            include: this.courseInclude(),
        });
    }

    async updateCourse(instructorId: string, courseId: string, dto: UpdateTrainingCourseDto) {
        await this.requireOwnedCourse(instructorId, courseId);

        return this.prisma.trainingCourse.update({
            where: { id: courseId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.skills !== undefined && { skills: dto.skills }),
                ...(dto.price !== undefined && { price: dto.price }),
                ...(dto.currency !== undefined && { currency: dto.currency }),
                ...(dto.status !== undefined && { status: dto.status }),
            },
            include: this.courseInclude(),
        });
    }

    async listDiscover(query: TrainingCourseListQueryDto) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 100);
        const skip = (page - 1) * limit;

        const where: Prisma.TrainingCourseWhereInput = {
            status: TrainingCourseStatus.PUBLISHED,
            ...(query.skill ? { skills: { has: query.skill } } : {}),
            ...(query.q
                ? {
                      OR: [
                          { title: { contains: query.q, mode: "insensitive" } },
                          { description: { contains: query.q, mode: "insensitive" } },
                      ],
                  }
                : {}),
        };

        const [items, total] = await Promise.all([
            this.prisma.trainingCourse.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: {
                    ...this.courseInclude(),
                    cohorts: {
                        where: {
                            status: {
                                in: [TrainingCohortStatus.OPEN, TrainingCohortStatus.IN_PROGRESS],
                            },
                        },
                        orderBy: { startsAt: "asc" },
                    },
                },
            }),
            this.prisma.trainingCourse.count({ where }),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }

    async listMyCourses(instructorId: string) {
        return this.prisma.trainingCourse.findMany({
            where: { instructorId },
            orderBy: { createdAt: "desc" },
            include: {
                ...this.courseInclude(),
                cohorts: { orderBy: { startsAt: "asc" } },
            },
        });
    }

    async getCourse(courseId: string) {
        const course = await this.prisma.trainingCourse.findUnique({
            where: { id: courseId },
            include: {
                ...this.courseInclude(),
                cohorts: { orderBy: { startsAt: "asc" } },
            },
        });
        if (!course) {
            throw new NotFoundException("Training course not found");
        }
        return course;
    }

    async createCohort(instructorId: string, courseId: string, dto: CreateTrainingCohortDto) {
        const course = await this.requireOwnedCourse(instructorId, courseId);
        this.validateCohortDates(dto.startsAt, dto.endsAt);

        if (course.status === TrainingCourseStatus.ARCHIVED) {
            throw new BadRequestException("Cannot add cohorts to an archived course");
        }

        return this.prisma.trainingCohort.create({
            data: {
                courseId,
                title: dto.title ?? null,
                startsAt: new Date(dto.startsAt),
                endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
                capacity: dto.capacity,
            },
        });
    }

    async enroll(studentId: string, cohortId: string, dto: EnrollTrainingCohortDto) {
        const cohort = await this.prisma.trainingCohort.findUnique({
            where: { id: cohortId },
            include: { course: true },
        });
        if (!cohort) {
            throw new NotFoundException("Training cohort not found");
        }
        if (cohort.course.instructorId === studentId) {
            throw new BadRequestException("You cannot enroll in your own course");
        }
        if (cohort.course.status !== TrainingCourseStatus.PUBLISHED) {
            throw new BadRequestException("Course is not published for enrollment");
        }
        if (
            cohort.status !== TrainingCohortStatus.OPEN &&
            cohort.status !== TrainingCohortStatus.IN_PROGRESS
        ) {
            throw new BadRequestException(`Cohort is not open for enrollment (${cohort.status})`);
        }
        if (cohort.enrolledCount >= cohort.capacity) {
            throw new BadRequestException("Cohort is full");
        }

        const existing = await this.prisma.trainingEnrollment.findUnique({
            where: {
                cohortId_studentId: { cohortId, studentId },
            },
        });
        if (existing && existing.status !== TrainingEnrollmentStatus.WITHDRAWN) {
            throw new BadRequestException("Already enrolled in this cohort");
        }

        const pricePaid = dto.pricePaid ?? cohort.course.price;

        const enrollment = await this.prisma.$transaction(async (tx) => {
            const created = existing
                ? await tx.trainingEnrollment.update({
                      where: { id: existing.id },
                      data: {
                          status: TrainingEnrollmentStatus.ENROLLED,
                          pricePaid,
                          enrolledAt: new Date(),
                          completedAt: null,
                      },
                  })
                : await tx.trainingEnrollment.create({
                      data: {
                          cohortId,
                          studentId,
                          status: TrainingEnrollmentStatus.ENROLLED,
                          pricePaid,
                          enrolledAt: new Date(),
                      },
                  });

            const updatedCohort = await tx.trainingCohort.update({
                where: { id: cohortId },
                data: { enrolledCount: { increment: 1 } },
            });

            if (updatedCohort.enrolledCount >= updatedCohort.capacity) {
                await tx.trainingCohort.update({
                    where: { id: cohortId },
                    data: { status: TrainingCohortStatus.FULL },
                });
            }

            return created;
        });

        return this.getEnrollment(enrollment.id, studentId);
    }

    async completeEnrollment(instructorId: string, enrollmentId: string) {
        const enrollment = await this.prisma.trainingEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                cohort: { include: { course: true } },
            },
        });
        if (!enrollment) {
            throw new NotFoundException("Enrollment not found");
        }
        if (enrollment.cohort.course.instructorId !== instructorId) {
            throw new ForbiddenException("Only the course instructor can mark completion");
        }
        if (enrollment.status !== TrainingEnrollmentStatus.ENROLLED) {
            throw new BadRequestException(`Enrollment is ${enrollment.status}, not ENROLLED`);
        }

        const updated = await this.prisma.trainingEnrollment.update({
            where: { id: enrollmentId },
            data: {
                status: TrainingEnrollmentStatus.COMPLETED,
                completedAt: new Date(),
            },
            include: this.enrollmentInclude(),
        });

        return updated;
    }

    async listMyEnrollments(studentId: string) {
        return this.prisma.trainingEnrollment.findMany({
            where: { studentId },
            orderBy: { createdAt: "desc" },
            include: this.enrollmentInclude(),
        });
    }

    async getEnrollment(enrollmentId: string, userId: string) {
        const enrollment = await this.prisma.trainingEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                ...this.enrollmentInclude(),
                cohort: {
                    include: { course: { select: { instructorId: true } } },
                },
            },
        });
        if (!enrollment) {
            throw new NotFoundException("Enrollment not found");
        }

        const isParticipant =
            enrollment.studentId === userId || enrollment.cohort.course.instructorId === userId;
        if (!isParticipant) {
            throw new ForbiddenException("Not allowed to view this enrollment");
        }

        const { cohort, ...rest } = enrollment;
        return rest;
    }

    private async requireOwnedCourse(instructorId: string, courseId: string) {
        const course = await this.prisma.trainingCourse.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new NotFoundException("Training course not found");
        }
        if (course.instructorId !== instructorId) {
            throw new ForbiddenException("You do not own this training course");
        }
        return course;
    }

    private validateCohortDates(startsAt: string, endsAt?: string) {
        const start = new Date(startsAt);
        if (Number.isNaN(start.getTime())) {
            throw new BadRequestException("Invalid startsAt");
        }
        if (endsAt) {
            const end = new Date(endsAt);
            if (Number.isNaN(end.getTime())) {
                throw new BadRequestException("Invalid endsAt");
            }
            if (end <= start) {
                throw new BadRequestException("endsAt must be after startsAt");
            }
        }
    }

    private courseInclude() {
        return {
            instructor: {
                select: {
                    id: true,
                    capLevel: true,
                    profile: {
                        select: { name: true, username: true, avatarUrl: true, title: true },
                    },
                },
            },
        } as const;
    }

    private enrollmentInclude() {
        return {
            cohort: {
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                            currency: true,
                            instructorId: true,
                        },
                    },
                },
            },
            student: {
                select: {
                    id: true,
                    profile: { select: { name: true, username: true, avatarUrl: true } },
                },
            },
        } as const;
    }
}
