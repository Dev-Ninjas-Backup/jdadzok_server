import { Module } from "@nestjs/common";
import { PostCategoryController } from "./post-category.controller";
import { PostCategoryRepository } from "./post-category.repository";
import { PostCategoryService } from "./post-category.service";

@Module({
    controllers: [PostCategoryController],
    providers: [PostCategoryRepository, PostCategoryService],
    exports: [PostCategoryRepository],
})
export class CategoryModule {}
