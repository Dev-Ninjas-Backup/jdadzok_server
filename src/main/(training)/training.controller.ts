import { GetUser, MakePublic, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
    CreateTrainingCohortDto,
    CreateTrainingCourseDto,
    EnrollTrainingCohortDto,
    TrainingCourseListQueryDto,
    UpdateTrainingCourseDto,
} from "./dto/training.dto";
import { TrainingService } from "./training.service";

@ApiTags("Training & courses")
@Controller("training")
export class TrainingController {
    constructor(private readonly trainingService: TrainingService) {}

    @Get("courses")
    @MakePublic()
    @ApiOperation({ summary: "Discover published training courses" })
    async discover(@Query() query: TrainingCourseListQueryDto) {
        const data = await this.trainingService.listDiscover(query);
        return successResponse(data, "Training courses retrieved");
    }

    @Get("courses/me")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "My courses as instructor" })
    async myCourses(@GetUser("userId") userId: string) {
        const data = await this.trainingService.listMyCourses(userId);
        return successResponse(data, "Your training courses retrieved");
    }

    @Get("enrollments/me")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "My course enrollments" })
    async myEnrollments(@GetUser("userId") userId: string) {
        const data = await this.trainingService.listMyEnrollments(userId);
        return successResponse(data, "Your enrollments retrieved");
    }

    @Get("enrollments/:enrollmentId")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get enrollment detail (student or instructor)" })
    async getEnrollment(
        @GetUser("userId") userId: string,
        @Param("enrollmentId") enrollmentId: string,
    ) {
        const data = await this.trainingService.getEnrollment(enrollmentId, userId);
        return successResponse(data, "Enrollment retrieved");
    }

    @Post("courses")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Create a training course / workshop" })
    async createCourse(
        @GetUser("userId") userId: string,
        @Body() dto: CreateTrainingCourseDto,
    ) {
        const data = await this.trainingService.createCourse(userId, dto);
        return successResponse(data, "Training course created");
    }

    @Patch("courses/:courseId")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update own training course" })
    async updateCourse(
        @GetUser("userId") userId: string,
        @Param("courseId") courseId: string,
        @Body() dto: UpdateTrainingCourseDto,
    ) {
        const data = await this.trainingService.updateCourse(userId, courseId, dto);
        return successResponse(data, "Training course updated");
    }

    @Post("courses/:courseId/cohorts")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Add a cohort to a course" })
    async createCohort(
        @GetUser("userId") userId: string,
        @Param("courseId") courseId: string,
        @Body() dto: CreateTrainingCohortDto,
    ) {
        const data = await this.trainingService.createCohort(userId, courseId, dto);
        return successResponse(data, "Training cohort created");
    }

    @Post("cohorts/:cohortId/enroll")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Enroll in a cohort (course purchase scaffold)" })
    async enroll(
        @GetUser("userId") userId: string,
        @Param("cohortId") cohortId: string,
        @Body() dto: EnrollTrainingCohortDto,
    ) {
        const data = await this.trainingService.enroll(userId, cohortId, dto);
        return successResponse(data, "Enrolled in training cohort");
    }

    @Patch("enrollments/:enrollmentId/complete")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Mark student enrollment completed (instructor)" })
    async completeEnrollment(
        @GetUser("userId") userId: string,
        @Param("enrollmentId") enrollmentId: string,
    ) {
        const data = await this.trainingService.completeEnrollment(userId, enrollmentId);
        return successResponse(data, "Enrollment marked completed");
    }

    @Get("courses/:courseId")
    @MakePublic()
    @ApiOperation({ summary: "Get training course with cohorts" })
    async getCourse(@Param("courseId") courseId: string) {
        const data = await this.trainingService.getCourse(courseId);
        return successResponse(data, "Training course retrieved");
    }
}
