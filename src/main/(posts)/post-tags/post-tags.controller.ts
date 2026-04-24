import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { CreatePostTagUserDto, UpdatePostTagUserDto } from "./dto/post-tags.create.dto";
import { PostTagsService } from "./post-tags.service";

@ApiBearerAuth()
@Controller("post-tags")
export class PostTagsController {
    constructor(private readonly service: PostTagsService) {}

    @Post()
    async store(@Body() body: CreatePostTagUserDto[]) {
        try {
            const tag = await this.service.create(body);
            return { data: tag, message: "Tag created successfully" };
        } catch (err) {
            return err;
        }
    }

    @Get()
    async index() {
        try {
            const tags = await this.service.index();
            return tags;
        } catch (err) {
            return err;
        }
    }

    @Get(":id")
    async find(@Param("id") id: string) {
        try {
            const tag = await this.service.findOne(id);
            return tag;
        } catch (err) {
            return err;
        }
    }

    @Put(":id")
    async update(@Param("id") id: string, @Body() body: UpdatePostTagUserDto) {
        try {
            const tag = await this.service.update(id, body);
            return successResponse(tag, "Tag updated successfully");
        } catch (err) {
            return err;
        }
    }

    @Delete(":id")
    async destroy(@Param("id") id: string) {
        try {
            await this.service.remove(id);
            return { message: "Tag deleted successfully" };
        } catch (err) {
            return err;
        }
    }
}
