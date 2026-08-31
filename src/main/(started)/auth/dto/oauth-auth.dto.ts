import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class FirebaseAuthDto {
    @ApiProperty({
        description:
            "Firebase ID token from Firebase Auth (after Google/Apple sign-in on mobile via Firebase SDK)",
    })
    @IsString()
    @IsNotEmpty()
    idToken: string;

    @ApiPropertyOptional({
        description: "Display name override (e.g. first Apple sign-in when Firebase name is empty)",
    })
    @IsOptional()
    @IsString()
    name?: string;
}

/** @deprecated Use FirebaseAuthDto — token must be a Firebase ID token, not a raw Google token */
export class GoogleAuthDto extends FirebaseAuthDto {}

/** @deprecated Use FirebaseAuthDto — token must be a Firebase ID token, not a raw Apple token */
export class AppleAuthDto extends FirebaseAuthDto {}
