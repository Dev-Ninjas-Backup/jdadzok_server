import { cookieHandler } from "@common/jwt/cookie.handler";
import { GetVerifiedUser, MakePublic } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { ResentOtpDto } from "@module/(users)/users/dto/resent-otp.dto";
import {
    Body,
    ClassSerializerInterceptor,
    Controller,
    Post,
    Res,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { TUser, VerifiedUser } from "@type/index";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { ForgetPasswordDto } from "./dto/forget.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyTokenDto } from "./dto/verify-token.dto";
import { ChangedPasswordDto } from "./dto/change.password.dto";
import { AppleAuthDto, FirebaseAuthDto, GoogleAuthDto } from "./dto/oauth-auth.dto";

@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @UseInterceptors(ClassSerializerInterceptor)
    @MakePublic()
    @Post("login")
    @UsePipes(ValidationPipe)
    async login(@Res({ passthrough: true }) res: Response, @Body() loginAuthDto: LoginDto) {
        try {
            const result = await this.authService.login(loginAuthDto);
            // set cookie to the response
            cookieHandler(res, "set", result.accessToken);
            return successResponse(result, "Login successfull!");
        } catch (err) {
            return err;
        }
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @MakePublic()
    @Post("firebase")
    @UsePipes(ValidationPipe)
    async loginWithFirebase(
        @Res({ passthrough: true }) res: Response,
        @Body() body: FirebaseAuthDto,
    ) {
        const result = await this.authService.loginWithFirebase(body.idToken, body.name);
        cookieHandler(res, "set", result.accessToken);
        return successResponse(result, "Firebase login successful");
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @MakePublic()
    @Post("google")
    @UsePipes(ValidationPipe)
    async loginWithGoogle(@Res({ passthrough: true }) res: Response, @Body() body: GoogleAuthDto) {
        const result = await this.authService.loginWithGoogle(body.idToken);
        cookieHandler(res, "set", result.accessToken);
        return successResponse(result, "Google login successful");
    }

    @UseInterceptors(ClassSerializerInterceptor)
    @MakePublic()
    @Post("apple")
    @UsePipes(ValidationPipe)
    async loginWithApple(@Res({ passthrough: true }) res: Response, @Body() body: AppleAuthDto) {
        const result = await this.authService.loginWithApple(body.idToken, body.name);
        cookieHandler(res, "set", result.accessToken);
        return successResponse(result, "Apple login successful");
    }

    @ApiBearerAuth()
    @Post("logout")
    // @UseGuards(JwtAuthGuard)
    async logout(@Res({ passthrough: true }) res: Response, @GetVerifiedUser() user: TUser) {
        try {
            await this.authService.logout(user.email);
            cookieHandler(res, "clear");
            return successResponse(null, "Logout successful!");
        } catch (err) {
            return err;
        }
    }

    @MakePublic()
    @Post("forget-password")
    async forgetPassword(@Body() body: ForgetPasswordDto) {
        try {
            const result = await this.authService.forgetPassword(body);
            return successResponse(
                result,
                "Password reset email sent successfully! Please check your mail.",
            );
        } catch (err) {
            return err;
        }
    }

    @MakePublic()
    @Post("resent-code")
    async resentCode(@Body() body: ResentOtpDto) {
        try {
            const result = await this.authService.resnetOtp(body);
            return successResponse(
                result,
                "Resend code email sent successfully! Please check your mail.",
            );
        } catch (err) {
            return err;
        }
    }

    @MakePublic()
    @Post("verify-token")
    async verifyToken(@Body() body: VerifyTokenDto) {
        try {
            const result = await this.authService.verify(body);
            return successResponse(result, "Token verified successfully!");
        } catch (err) {
            return err;
        }
    }

    @MakePublic()
    @Post("reset-password")
    async resetPassword(@Body() payload: ResetPasswordDto) {
        try {
            const result = await this.authService.resetPassword(payload);
            return successResponse(result, "Password was reset successfully!");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Post("change-password")
    async changedPassword(@GetVerifiedUser() user: VerifiedUser, @Body() dto: ChangedPasswordDto) {
        return await this.authService.changedPassword(user.id, dto);
    }
}
