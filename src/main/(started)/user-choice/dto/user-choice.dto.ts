import { ApiProperty, PartialType } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsUUID } from "class-validator";

export class CreateUserChoiceDto {
    @ApiProperty({
        example: ["550e8400-e29b-41d4-a716-446655440000"],
        description: "List of choice UUIDs the user selects",
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsUUID("4", { each: true })
    ids: string[];
}

export class UpdateUserChoiceDto extends PartialType(CreateUserChoiceDto) {}
