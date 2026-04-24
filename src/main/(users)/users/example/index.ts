import { getSchemaPath } from "@nestjs/swagger";
import { UpdateUserDto } from "../dto/update.user.dto";

export const fromDataExample = {
    schema: {
        allOf: [
            { $ref: getSchemaPath(UpdateUserDto) },
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
