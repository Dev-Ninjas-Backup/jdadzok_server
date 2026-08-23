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
import {
    EndorseVolunteerHourDto,
    RejectVolunteerHourDto,
} from "./dto/endorse-volunteer-hour.dto";
import { VolunteerHourEndorsementService } from "./volunteer-hour-endorsement.service";
import { VolunteerHourCounterpartyService } from "./volunteer-hour-counterparty.service";
import { VolunteerHoursBankService } from "./volunteer-hours-bank.service";
import {
    ConfirmCounterpartyHourDto,
    RejectCounterpartyHourDto,
} from "./dto/counterparty-volunteer-hour.dto";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("volunteer")
export class VolunteerController {
    constructor(
        private readonly volunteerService: VolunteerService,
        private readonly hourEndorsementService: VolunteerHourEndorsementService,
        private readonly hourCounterpartyService: VolunteerHourCounterpartyService,
        private readonly hoursBankService: VolunteerHoursBankService,
    ) {}

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

    @ApiOperation({ summary: "List contribution types (mentoring, advice, …, Other)" })
    @Get("contribution-types")
    listContributionTypes() {
        return handleRequest(
            () => Promise.resolve(this.volunteerService.listContributionTypes()),
            "Contribution types retrieved",
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
            "Self-reported hours logged (pending endorsement — not counted toward Cap until verified)",
        );
    }

    @ApiOperation({ summary: "List your volunteer hour entries and verification status" })
    @Get("my-hours")
    getMyHours(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.hourEndorsementService.listMyHours(user.id),
            "Volunteer hours retrieved",
        );
    }

    @ApiOperation({
        summary:
            "Lifetime verified hours bank (aggregated across projects) + Black threshold progress",
    })
    @Get("hours-bank")
    getHoursBank(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.hoursBankService.getBankStatus(user.id),
            "Lifetime volunteer hours bank retrieved",
        );
    }

    @ApiOperation({
        summary:
            "List pending self-reported hours you can endorse (higher Cap than logger, or admin)",
    })
    @Get("hours/pending-endorsement")
    listPendingEndorsement(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.hourEndorsementService.listPendingForEndorsement(user.id),
            "Pending endorsement queue retrieved",
        );
    }

    @ApiOperation({
        summary:
            "Endorse pending self-reported hours (higher-Cap member or admin) — credits Cap metrics",
    })
    @Patch("hours/:hourId/endorse")
    endorseHours(
        @Param("hourId") hourId: string,
        @Body() dto: EndorseVolunteerHourDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return handleRequest(
            () => this.hourEndorsementService.endorseHour(hourId, user.id, dto),
            "Volunteer hours endorsed and counted toward Cap",
        );
    }

    @ApiOperation({ summary: "Reject pending self-reported hours" })
    @Patch("hours/:hourId/reject")
    rejectHours(
        @Param("hourId") hourId: string,
        @Body() dto: RejectVolunteerHourDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return handleRequest(
            () => this.hourEndorsementService.rejectHour(hourId, user.id, dto),
            "Volunteer hours rejected",
        );
    }

    @ApiOperation({
        summary:
            "List mentoring/advice hours awaiting your confirmation as mentee / recipient",
    })
    @Get("hours/pending-counterparty")
    listPendingCounterparty(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(
            () => this.hourCounterpartyService.listPendingCounterpartyConfirmation(user.id),
            "Pending counterparty confirmation queue retrieved",
        );
    }

    @ApiOperation({
        summary:
            "Confirm a mentoring/advice session as mentee — unlocks Cap credit (calls) or endorsement queue (self-report)",
    })
    @Patch("hours/:hourId/confirm-counterparty")
    confirmCounterparty(
        @Param("hourId") hourId: string,
        @Body() dto: ConfirmCounterpartyHourDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return handleRequest(
            () => this.hourCounterpartyService.confirmHour(hourId, user.id, dto),
            "Session confirmed by counterparty",
        );
    }

    @ApiOperation({ summary: "Reject a mentoring/advice session as mentee / recipient" })
    @Patch("hours/:hourId/reject-counterparty")
    rejectCounterparty(
        @Param("hourId") hourId: string,
        @Body() dto: RejectCounterpartyHourDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        return handleRequest(
            () => this.hourCounterpartyService.rejectHour(hourId, user.id, dto),
            "Session rejected by counterparty",
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
