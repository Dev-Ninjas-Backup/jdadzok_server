import { Controller, ForbiddenException, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { EventService } from "../service/event.service";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { EventQueryDto } from "../dto/eventQuery.dto";

@ApiTags("Events-projects")
@Controller("events-projects")
export class EventController {
    constructor(private readonly eventService: EventService) {}

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
}
