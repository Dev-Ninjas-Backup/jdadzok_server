import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Get, Put, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UpdateTermsAndConditionsDto } from "./dto/terms-and-conditions.dto";
import { TermsAndConditionsService } from "./terms-and-conditions.service";

@ApiTags("terms-and-conditions")
@Controller("terms-and-conditions")
export class TermsAndConditionsController {
    constructor(private readonly termsService: TermsAndConditionsService) {}

    @Get()
    @ApiOperation({ summary: "Get Terms and Conditions (public)" })
    async getTermsAndConditions() {
        return await this.termsService.getTermsAndConditions();
    }

    @Put()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @UsePipes(new ValidationPipe({ whitelist: true }))
    @ApiOperation({ summary: "Update Terms and Conditions (admin only)" })
    async updateTermsAndConditions(@Body() input: UpdateTermsAndConditionsDto) {
        return await this.termsService.upsertTermsAndConditions(input);
    }
}
