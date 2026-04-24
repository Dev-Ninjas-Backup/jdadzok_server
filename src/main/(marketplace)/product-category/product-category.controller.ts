import { handleRequest } from "@common/utils/handle.request.util";
import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { ProductCategoryService } from "./product-category.service";

@Controller("product-category")
export class ProductCategoryController {
    constructor(private readonly service: ProductCategoryService) {}

    @Post("")
    async create(@Body() dto: CreateProductCategoryDto) {
        return handleRequest(() => this.service.create(dto), "Added Product Category Successfully");
    }
    @Get("")
    async findAll() {
        return handleRequest(() => this.service.findAll(), "Get All Product Category Successfully");
    }

    @Get(":id")
    async findOne(@Param("id") id: string) {
        return handleRequest(() => this.service.findOne(id), "Get Product Category Successfully");
    }

    @Patch(":id")
    async update(@Param("id") id: string, @Body() dto: UpdateProductCategoryDto) {
        return handleRequest(
            () => this.service.update(id, dto),
            "Update Product Category Successfully",
        );
    }

    @Delete(":id")
    async remove(@Param("id") id: string) {
        return handleRequest(() => this.service.remove(id), "Delete Product Category Successfully");
    }
}
