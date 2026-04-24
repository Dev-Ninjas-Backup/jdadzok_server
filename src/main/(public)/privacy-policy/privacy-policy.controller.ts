import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Get, Put, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UpdatePrivacyPolicyDto } from "./dto/privacy-policy.dto";
import { PrivacyPolicyService } from "./privacy-policy.service";

@ApiTags("privacy-policy")
@Controller("privacy-policy")
export class PrivacyPolicyController {
    constructor(private readonly privacyPolicyService: PrivacyPolicyService) {}

    @Get()
    @ApiOperation({ summary: "Get the Privacy Policy (public)" })
    async getPrivacyPolicy() {
        return await this.privacyPolicyService.getPrivacyPolicy();
    }

    @Put()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @UsePipes(new ValidationPipe({ whitelist: true }))
    @ApiOperation({ summary: "Update Privacy Policy (admin only)" })
    async updatePrivacyPolicy(@Body() input: UpdatePrivacyPolicyDto) {
        return await this.privacyPolicyService.upsertPrivacyPolicy(input);
    }
}
