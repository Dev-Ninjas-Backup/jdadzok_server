import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { HelperTx } from "@type/index";
import { CreatePostTagUserDto, UpdatePostTagUserDto } from "./dto/post-tags.create.dto";

@Injectable()
export class PostTagsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async txStore(tx: HelperTx, data: CreatePostTagUserDto[]) {
        return await tx.postTagUser.createMany({ data, skipDuplicates: true });
    }
    async store(data: Required<CreatePostTagUserDto[]>) {
        return await this.prisma.postTagUser.createMany({
            data,
        });
    }

    async findAll() {
        return await this.prisma.postTagUser.findMany({
            orderBy: {
                createdAt: "asc",
            },
        });
    }

    async findById(id: string) {
        return await this.prisma.postTagUser.findUnique({
            where: { id },
            include: {
                post: true,
                user: true,
            },
        });
    }

    async update(id: string, data: UpdatePostTagUserDto) {
        return await this.prisma.postTagUser.update({
            where: { id },
            data,
        });
    }

    async remove(id: string) {
        return await this.prisma.postTagUser.delete({
            where: { id },
        });
    }
}
