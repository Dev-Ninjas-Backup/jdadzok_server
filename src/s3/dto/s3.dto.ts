import { ApiProperty } from "@nestjs/swagger";

export class S3ResponseDto {
    @ApiProperty()
    originalName: string;

    @ApiProperty()
    type: string;

    @ApiProperty()
    size: number;

    @ApiProperty()
    url: string;
}
