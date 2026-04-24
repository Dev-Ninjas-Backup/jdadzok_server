import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export enum MetricsType {
    POST = "post",
    LIKE = "like",
    COMMENT = "comment",
    SHARE = "share",
    FOLLOWER = "follower",
}

export enum MetricsRange {
    DAYS_7 = "7d",
    MONTH_1 = "1m",
    MONTH_6 = "6m",
    YEAR_1 = "1y",
}

export class UserMetricsFilterDto {
    @ApiProperty({
        enum: MetricsType,
        required: false,
        example: MetricsType.POST,
    })
    @IsOptional()
    @IsEnum(MetricsType)
    type?: MetricsType;

    @ApiProperty({
        enum: MetricsRange,
        required: false,
        example: MetricsRange.DAYS_7,
    })
    @IsOptional()
    @IsEnum(MetricsRange)
    range?: MetricsRange;
}
