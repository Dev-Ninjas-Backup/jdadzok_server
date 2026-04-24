import { Controller } from "@nestjs/common";
import { PostMetadataService } from "./post.metadata.service";

@Controller("posts/metadata")
export class PostMetadataController {
    constructor(private readonly service: PostMetadataService) {}
}
