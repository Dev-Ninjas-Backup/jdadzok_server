import { ApiBodyOptions } from "@nestjs/swagger";
import { CreatePostTagUserDto } from "../dto/post-tags.create.dto";

export const postTagsBodyOptions: ApiBodyOptions = {
    isArray: true,
    type: CreatePostTagUserDto,
    description: "An array of tag user objects",
    examples: {
        example1: {
            value: [
                {
                    userId: "user_uuid",
                    postId: "", // this is optional
                },
                {
                    userId: "",
                    postId: "", // this is optional
                },
            ],
        },
    },
};
