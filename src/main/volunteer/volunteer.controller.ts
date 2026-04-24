import { Controller, Post, Body, UseGuards, Get, Patch, Param, Delete } from "@nestjs/common";
import { VolunteerService } from "./volunteer.service";
import { CreateVolunteerProjectDto } from "./dto/create-volunteer-project.dto";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { handleRequest } from "@common/utils/handle.request.util";
import { ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ApplyVolunteerDto } from "./dto/apply-volunteer.dto";
import { LogHoursDto } from "./dto/log-hours.dto";
import { UpdateStatusDto } from "./dto/update-status.dto";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("volunteer")
export class VolunteerController {
    constructor(private readonly volunteerService: VolunteerService) {}

    @ApiOperation({ summary: "Create new volunteer projects for ngo" })
    @Post("projects")
    createProject(@Body() dto: CreateVolunteerProjectDto, @GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.volunteerService.createProject(dto, user.id),
            "Ngo create volunteer project successfully",
        );
    }

    @ApiOperation({ summary: "Get all volunteer projects" })
    @Get("allProjects")
    getAllNgoProjects(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.volunteerService.getAllNgoProjects(user.id),
            "Get all ngo volunteer project successfully",
        );
    }

    @ApiOperation({
        summary: "Get all volunteer projects created by the logged-in NGO Owner && User",
    })
    @Get("my-projects")
    getMyProjects(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.volunteerService.getNgoProjects(user.id),
            "Get my ngo volunteer project successfully",
        );
    }

    @ApiOperation({ summary: "Apply Volunteer project" })
    @Post("apply")
    applyToProject(@Body() dto: ApplyVolunteerDto, @GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.volunteerService.applyToProject(dto, user.id),
            "Apply volunteer project successfully",
        );
    }

    @ApiOperation({ summary: "Get all volunteer applications under a specific project" })
    @Get("project/:projectId/applications")
    getProjectApplications(
        @Param("projectId") projectId: string,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return handleRequest(
            () => this.volunteerService.getProjectApplications(projectId, user.id),
            "Fetched all volunteer applications for this project successfully",
        );
    }

    @ApiOperation({ summary: "Log working hours for a volunteer application" })
    @Patch("log-hours/:applicationId")
    logHours(
        @Param("applicationId") id: string,
        @Body() dto: LogHoursDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return handleRequest(
            () => this.volunteerService.logHours(id, dto, user.id),
            "Updated Working Hour successfully",
        );
    }

    @ApiOperation({
        summary:
            "Only the owner of the NGO that created this project can update the application status.",
    })
    @Patch("status/:applicationId")
    updateStatus(
        @Param("applicationId") id: string,
        @Body() dto: UpdateStatusDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return this.volunteerService.updateStatus(id, dto, user.id);
    }

    @ApiOperation({ summary: "See own application details" })
    @Get("my-applications")
    getMyApplications(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.volunteerService.getVolunteerApplications(user.id),
            "Get My Apply of volunteer project successfully",
        );
    }

    @ApiOperation({ summary: "Delete Volunteer Project" })
    @Delete("delete/:projectId")
    removeProject(@Param("projectId") projectId: string, @GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.volunteerService.removeProject(projectId, user.id),
            "Delete Project Successfully.",
        );
    }
}
