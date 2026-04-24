import { getSchemaPath } from "@nestjs/swagger";
import { CreatePostDto } from "../dto/create.post.dto";

export const fromDataExample = {
    schema: {
        allOf: [
            { $ref: getSchemaPath(CreatePostDto) },
            {
                type: "object",
                properties: {
                    files: {
                        type: "array",
                        items: { type: "string", format: "binary" },
                        maxItems: 20,
                    },
                },
            },
        ],
    },
};
