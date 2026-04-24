import { IsUUID, IsNumber, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class DonationDto {
    //   @ApiProperty({
    //     description: "ID of the user who is making the donation",
    //     example: "838a937e-9c4e-4a10-9d92-abcd1234abcd",
    //   })
    //   @IsUUID()
    //   donorId: string;

    @ApiProperty({
        description: "ID of the NGO receiving the donation",
        example: "951a1ac1-77cd-487c-98df-dd1234123412",
    })
    @IsUUID()
    ngoId: string;

    @ApiProperty({
        description: "Amount to donate in cents (100 = $1)",
        example: 5000,
    })
    @IsNumber()
    @Min(1)
    amount: number;
}
