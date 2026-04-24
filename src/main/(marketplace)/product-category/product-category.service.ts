import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { slugify } from "@utils/index";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";

@Injectable()
export class ProductCategoryService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateProductCategoryDto) {
        const uniSlug = slugify(dto.name);
        const existCategory = await this.prisma.productCategory.findFirst({
            where: { slug: uniSlug },
        });
        if (existCategory) {
            throw new BadRequestException("This Product Category Already Exist.");
        }
        const category = await this.prisma.productCategory.create({
            data: {
                name: dto.name,
                slug: uniSlug,
                description: dto.description,
            },
        });
        return category;
    }

    async findAll() {
        return await this.prisma.productCategory.findMany({});
    }

    async findOne(id: string) {
        const category = await this.prisma.productCategory.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException("Product Category Not Found.");
        }

        return category;
    }

    async update(id: string, dto: UpdateProductCategoryDto) {
        const existingCategory = await this.prisma.productCategory.findUnique({
            where: { id },
        });

        if (!existingCategory) {
            throw new NotFoundException("Product Category Not Found.");
        }

        let newSlug = existingCategory.slug;

        if (dto.name && dto.name !== existingCategory.name) {
            newSlug = slugify(dto.name);

            const duplicateCategory = await this.prisma.productCategory.findFirst({
                where: {
                    slug: newSlug,
                    NOT: {
                        id,
                    },
                },
            });

            if (duplicateCategory) {
                throw new BadRequestException(
                    "Another Product Category With This Name Already Exist.",
                );
            }
        }

        const updatedCategory = await this.prisma.productCategory.update({
            where: { id },
            data: {
                name: dto.name ?? existingCategory.name,
                slug: newSlug,
                description:
                    dto.description !== undefined ? dto.description : existingCategory.description,
            },
        });

        return updatedCategory;
    }

    async remove(id: string) {
        const existingCategory = await this.prisma.productCategory.findUnique({
            where: { id },
        });

        if (!existingCategory) {
            throw new NotFoundException("Product Category Not Found.");
        }

        return await this.prisma.productCategory.delete({
            where: { id },
        });
    }
}
