import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class MaintenanceSettingsDto {
    @ApiProperty({
        required: false,
        example: 100,
        description: "Maximum events allowed per community",
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    maxEventsPerCommunity?: number;

    @ApiProperty({
        required: false,
        example: 50,
        description: "Maximum posts allowed per day",
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    MaxPostPerDay?: number;
}
