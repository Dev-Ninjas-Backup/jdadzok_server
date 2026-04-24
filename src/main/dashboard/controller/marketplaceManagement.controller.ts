import { Controller, ForbiddenException, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { MarketplaceManagementService } from "../service/marketplaceManagement.service";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { ProductQueryDto } from "../dto/producQuery.dto";

@ApiTags("Marketplace")
@Controller("marketplace")
export class MarketplaceManagementController {
    constructor(private readonly service: MarketplaceManagementService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("stats")
    async getStats(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.service.getMarketplaceStats();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("products")
    async listProducts(@GetVerifiedUser() user: VerifiedUser, @Query() query: ProductQueryDto) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.service.listProducts(query);
    }
}
