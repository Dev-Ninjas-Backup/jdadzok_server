import { ApiProperty, IntersectionType, PartialType } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

class CreateLocation {
    @ApiProperty({
        example: "Central Park, New York",
        description: "Name of the location",
        type: String,
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: "40.7829,-73.9654",
        description: "Coordinates in lat,lng format",
        type: String,
        required: false,
    })
    @IsOptional()
    @IsString()
    coordinates?: string;
}
export class CreateLocationDto extends IntersectionType(CreateLocation) {}
export class UpdateLocationDto extends PartialType(IntersectionType(CreateLocation)) {}
