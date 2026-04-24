import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { handleRequest } from "@common/utils/handle.request.util";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CreateProductDto, updateProductDto } from "./dto/product.dto";
import { ProductQueryDto } from "./dto/product.query.dto";
import { ProductService } from "./product.service";
import { UpdateProductStatusDto } from "./dto/updateStatusDto";
import { VerifiedUser } from "@type/shared.types";
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductController {
    constructor(private readonly service: ProductService) {}

    @Post("/")
    @ApiOperation({ summary: "Create new product" })
    async create(@GetVerifiedUser() user: VerifiedUser, @Body() dto: CreateProductDto) {
        return handleRequest(
            () => this.service.create(user.id, dto),
            "Product created successfully",
        );
    }

    @Get("/")
    @ApiOperation({ summary: "Get all products with filters" })
    @ApiResponse({ status: 200, description: "List of products" })
    async findAll(@GetVerifiedUser() user: VerifiedUser, @Query() query?: ProductQueryDto) {
        return handleRequest(
            () => this.service.findAll(user.id, query),
            "Products fetched successfully",
        );
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a single product by ID" })
    @ApiResponse({ status: 200, description: "Product details" })
    async findOne(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        return handleRequest(
            () => this.service.findOne(user.id, id),
            "Get Single Product Successfully",
        );
    }

    @Patch(":id")
    @ApiOperation({ summary: "Update a product by ID" })
    @ApiResponse({ status: 200, description: "Product updated successfully" })
    async update(
        @GetVerifiedUser() user: VerifiedUser,
        @Param("id") id: string,
        @Body() dto: updateProductDto,
    ) {
        return handleRequest(
            () => this.service.update(user.id, id, dto),
            "Product updated successfully",
        );
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a product by Id" })
    @ApiResponse({ status: 200, description: "Product deleted successfully" })
    async remove(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        return handleRequest(
            () => this.service.remove(id, user.id),
            "Product deleted successfully",
        );
    }

    // update product status
    @Patch("status/:id")
    @ApiOperation({ summary: "Update product status by ID" })
    @ApiConsumes("multipart/formdata")
    async updateStatus(
        @Param("id") id: string,
        @Body() dto: UpdateProductStatusDto,
        @GetVerifiedUser() user: VerifiedUser,
    ) {
        try {
            const res = await this.service.updateProductStatus(id, dto, user.id);
            return {
                message: "Product status updated successfully",
                data: res,
            };
        } catch (err) {
            throw new HttpException(err.message, err.status);
        }
    }
}
