import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class ApplyVolunteerDto {
    @ApiProperty({ example: "project-uuid-here" })
    @IsNotEmpty()
    @IsString()
    projectId: string;
}
