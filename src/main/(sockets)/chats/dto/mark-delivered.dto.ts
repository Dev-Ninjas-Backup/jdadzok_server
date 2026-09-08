import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsUUID } from "class-validator";

export class MarkDeliveredDto {
    @ApiPropertyOptional({
        description:
            "Specific message ids to acknowledge as delivered. Omit to mark every still-SENT message in the chat as delivered.",
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUUID("4", { each: true })
    messageIds?: string[];
}
