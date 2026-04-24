import { GetUser, GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { handleRequest } from "@common/utils/handle.request.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CreateOrderDto } from "./dto/order.dto";
import { OrderService } from "./order.service";
import { VerifiedUser } from "@type/shared.types";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrderController {
    constructor(private readonly service: OrderService) {}

    @Post("/")
    @ApiOperation({ summary: "Added new order" })
    async add(@Body() dto: CreateOrderDto, @GetUser("userId") userId: string) {
        return handleRequest(() => this.service.add(userId, dto), "Added new order successfully");
    }

    @Get("/")
    @ApiOperation({ summary: "Get all product with filters" })
    @ApiResponse({ status: 200, description: "List of the orders" })
    async findAll() {
        return handleRequest(() => this.service.findAll(), "Get All Order Successfully");
    }

    @Get("/myOrder")
    @ApiOperation({ summary: "My all order" })
    @ApiResponse({ status: 200, description: "List of the order" })
    async myOrder(@GetVerifiedUser() user: VerifiedUser) {
        return handleRequest(() => this.service.myOrder(user.id), "Get All Order Successfully");
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single order by ID" })
    @ApiResponse({ status: 200, description: "Order details" })
    async findOne(@Param("id") id: string, @GetUser("userId") userId: string) {
        return handleRequest(
            () => this.service.findOne(id, userId),
            "Get Single Order Successfully",
        );
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a order by Id" })
    @ApiResponse({ status: 200, description: "Order deleted successfully" })
    async remove(@Param("id") id: string, @GetUser("userId") userId: string) {
        return handleRequest(() => this.service.remove(id, userId), "Order deleted successfully");
    }
}
