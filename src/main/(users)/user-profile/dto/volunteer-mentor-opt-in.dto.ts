import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class VolunteerMentorOptInDto {
    @ApiProperty({
        example: true,
        description:
            "Enable volunteering / mentoring tools and verified-hour logging (independent of Cap level)",
    })
    @IsBoolean()
    isVolunteerMentorOptIn: boolean;
}
