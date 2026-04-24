import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Controller, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CapLevelService } from "./cap-lavel.service";

@ApiBearerAuth()
@ApiTags("Cap Level Management")
@Controller("cap-level")
@UseGuards(JwtAuthGuard)
export class CapLevelController {
    constructor(private readonly service: CapLevelService) {}
}
