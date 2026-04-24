import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { CreatePostCategoryDto } from "./dto/category.dto";

@Injectable()
export class PostCategoryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async store(input: Required<CreatePostCategoryDto>) {
        return await this.prisma.postCategory.create({
            data: {
                ...input,
            },
        });
    }
    async findAll() {
        return await this.prisma.postCategory.findMany();
    }
}
