import { ApiProperty, IntersectionType } from "@nestjs/swagger";

class CategoryQueryDataTransferObject {
    @ApiProperty({
        example: "Technology",
        description: "Name of the category",
    })
    name: string;
}
export class CategoryQueryDto extends IntersectionType(CategoryQueryDataTransferObject) {}
