import { Injectable } from "@nestjs/common";
import { slugify } from "@utils/index";
import { CreatePostCategoryDto } from "./dto/category.dto";
import { PostCategoryRepository } from "./post-category.repository";

@Injectable()
export class PostCategoryService {
    constructor(private readonly repository: PostCategoryRepository) {}

    async create(input: CreatePostCategoryDto) {
        // generate slug from the name
        const slug = slugify(input.name);
        return await this.repository.store({ ...input, slug });
    }
    async index() {
        return await this.repository.findAll();
    }
}
