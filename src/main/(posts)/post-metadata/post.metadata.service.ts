import { Injectable } from "@nestjs/common";
import { PostMetadataRepository } from "./post.metadata.repository";

@Injectable()
export class PostMetadataService {
    constructor(private readonly repository: PostMetadataRepository) {}
}
