import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { CreatePostCategoryDto } from "./dto/category.dto";
import { PostCategoryService } from "./post-category.service";

@ApiBearerAuth()
@Controller("posts-categories")
export class PostCategoryController {
    constructor(private readonly service: PostCategoryService) {}

    @Post()
    async store(
        // @GetUser("user_id") userId: string,
        @Body() body: CreatePostCategoryDto,
    ) {
        try {
            const cat = await this.service.create(body);

            return cat;
        } catch (err) {
            return err;
        }
    }
    @Get()
    async index() {
        try {
            return await this.service.index();
        } catch (err) {
            return err;
        }
    }
}
