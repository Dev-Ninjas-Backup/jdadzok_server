import { BadRequestException, Injectable } from "@nestjs/common";
import { CreatePostTagUserDto, UpdatePostTagUserDto } from "./dto/post-tags.create.dto";
import { PostTagsRepository } from "./post-tags.repository";

@Injectable()
export class PostTagsService {
    constructor(private readonly repository: PostTagsRepository) {}

    async create(input: CreatePostTagUserDto[]) {
        return await this.repository.store(input);
    }

    async index() {
        return await this.repository.findAll();
    }

    async findOne(id: string) {
        return await this.repository.findById(id);
    }

    async update(id: string, input: UpdatePostTagUserDto) {
        if (!id) throw new BadRequestException("Tag ID is required");
        return await this.repository.update(id, input);
    }

    async remove(id: string) {
        if (!id) throw new BadRequestException("Tag ID is required");
        return await this.repository.remove(id);
    }
}
