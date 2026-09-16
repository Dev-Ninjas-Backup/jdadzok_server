import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { EventService } from "../service/event.service";
import { VolunteerService } from "@module/volunteer/volunteer.service";
import { CreateVolunteerProjectDto } from "@module/volunteer/dto/create-volunteer-project.dto";
import { UpdateVolunteerProjectDto } from "@module/volunteer/dto/update-volunteer-project.dto";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { EventQueryDto } from "../dto/eventQuery.dto";

@ApiTags("Events-projects")
@Controller("events-projects")
export class EventController {
    constructor(
        private readonly eventService: EventService,
        private readonly volunteerService: VolunteerService,
    ) {}

    @ApiOperation({ summary: "Super Admin: Get all community & NGO overview statistics" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("overview")
    async getOverview(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.eventService.getOverview();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get()
    async getEvents(@GetVerifiedUser() user: VerifiedUser, @Query() query: EventQueryDto) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.eventService.listEvents(query);
    }

    @ApiOperation({ summary: "Super Admin: create a volunteer project / event" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post()
    async createEvent(
        @GetVerifiedUser() user: VerifiedUser,
        @Body() dto: CreateVolunteerProjectDto,
    ) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.volunteerService.createProject(dto, user.id);
    }

    @ApiOperation({ summary: "Super Admin: update a volunteer project / event" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch(":id")
    async updateEvent(
        @GetVerifiedUser() user: VerifiedUser,
        @Param("id") id: string,
        @Body() dto: UpdateVolunteerProjectDto,
    ) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.volunteerService.updateProject(id, dto, user.id);
    }

    @ApiOperation({ summary: "Super Admin: delete a volunteer project / event" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Delete(":id")
    async deleteEvent(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.volunteerService.removeProject(id, user.id);
    }
}
