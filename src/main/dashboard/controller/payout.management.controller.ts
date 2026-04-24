import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Controller, ForbiddenException, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { VerifiedUser } from "@type/shared.types";
import { PayoutManagementService } from "../service/payout.management.service";
import { ProductOrderDto, ProductOrderSearchDto } from "../dto/productOrder.dto";

@ApiTags("Payout-management")
@Controller("admin/payoutManagement")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PayoutManagementController {
    constructor(private readonly payoutManagementService: PayoutManagementService) {}

    @ApiOperation({ summary: "Super Admin: Get dashboard summary overview" })
    @Get("summary")
    async getSummary(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.payoutManagementService.getSummary();
    }
    @Get("stats")
    async getPaidOrders(
        @GetVerifiedUser() user: VerifiedUser,
        @Query() searchDto: ProductOrderSearchDto,
    ): Promise<ProductOrderDto[]> {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return this.payoutManagementService.searchPaidOrders(searchDto);
    }
}
