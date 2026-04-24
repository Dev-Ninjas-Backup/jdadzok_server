import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth"; // Adjust path
import { Body, Controller, Get, Put, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AboutUsService } from "./about-us.service";
import { UpdateAboutUsDto } from "./dto/about-us.dto";

@ApiTags("about-us")
@Controller("about-us")
export class AboutUsController {
    constructor(private readonly aboutUsService: AboutUsService) {}

    @Get()
    @ApiOperation({ summary: "Get the About Us information (public)" })
    async getAboutUs() {
        return await this.aboutUsService.getAboutUs();
    }

    @Put()
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard) // Protect update endpoint
    @UsePipes(new ValidationPipe({ whitelist: true }))
    @ApiOperation({ summary: "Update About Us information (admin only)" })
    async updateAboutUs(@Body() input: UpdateAboutUsDto) {
        return await this.aboutUsService.upsertAboutUs(input);
    }
}
