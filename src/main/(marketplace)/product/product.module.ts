import { Module } from "@nestjs/common";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { HelperService } from "./helper/helper";

@Module({
    controllers: [ProductController],
    providers: [ProductService, HelperService],
})
export class ProductModule {}
