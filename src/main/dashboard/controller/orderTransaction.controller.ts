import { Controller, Get, Query, UseGuards, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { OrderTransactionService } from "../service/orderTransation.service";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";
import { OrderListQueryDto } from "../dto/orderListQuery.dto";

@ApiTags("Orders_Transaction")
@Controller("orders_transaction")
export class OrderTransactionController {
    constructor(private readonly service: OrderTransactionService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("stats")
    @ApiOperation({ summary: "Get dashboard stats for orders" })
    getStats(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbidden access");
        return this.service.getDashboardStats();
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get()
    @ApiOperation({ summary: "List all orders with filters, search & pagination" })
    listOrders(@GetVerifiedUser() user: VerifiedUser, @Query() query: OrderListQueryDto) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }

        return this.service.listOrders(query);
    }
}
