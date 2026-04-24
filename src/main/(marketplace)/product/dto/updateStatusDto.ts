import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import { IsEnum, IsNotEmpty } from "class-validator";

export class UpdateProductStatusDto {
    @ApiProperty({
        description: "Product availability status",
        enum: Status,
        enumName: "Status",
    })
    @IsNotEmpty()
    @IsEnum(Status, { message: "Status must be one of AVAILABLE, SOLDOUT, or DISCONTINUED" })
    status: Status;
}
