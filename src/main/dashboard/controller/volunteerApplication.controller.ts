import { ValidateSuperAdmin } from "@common/jwt/jwt.decorator";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetVolunteerApplicationsQueryDto } from "../dto/volunteerApplicationQuery.dto";
import { VolunteerApplicationService } from "../service/volunteerApplication.service";

@ApiTags("Volunteer Application Management")
@ApiBearerAuth()
@ValidateSuperAdmin()
@Controller("admin/volunteer/applications")
export class VolunteerApplicationController {
    constructor(private readonly service: VolunteerApplicationService) {}

    @ApiOperation({
        summary: "Super Admin: list volunteer applications across all projects, with filters",
    })
    @Get()
    async listApplications(@Query() query: GetVolunteerApplicationsQueryDto) {
        return this.service.listApplications(query);
    }
}
