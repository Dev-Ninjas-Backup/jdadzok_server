import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class TogglePostDto {
    @ApiProperty({
        example: "true",
    })
    @IsOptional()
    @IsBoolean()
    hide?: boolean;
}
