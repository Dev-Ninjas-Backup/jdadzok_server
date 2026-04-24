import { GetUser, GetVerifiedUser, MakePublic } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { VerifyTokenDto } from "@module/(started)/auth/dto/verify-token.dto";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { TUser, VerifiedUser } from "@type/index";
import { omit } from "@utils/index";
import { ResentOtpDto } from "./dto/resent-otp.dto";
import { UpdateUserDto } from "./dto/update.user.dto";
import { CreateUserDto } from "./dto/users.dto";
import { UserService } from "./users.service";
import { handleRequest } from "@common/utils/handle.request.util";

@Controller("users")
export class UserController {
    constructor(private readonly service: UserService) {}

    @MakePublic()
    @Post("register")
    @UsePipes(ValidationPipe)
    async register(@Body() body: CreateUserDto) {
        try {
            const result = await this.service.register(body);

            if (result.hasAccount) {
                return successResponse(
                    omit(result, ["hasAccount"]),
                    "Already have account with this email, check your mail to verify OTP",
                );
            }
            return successResponse(
                omit(result, ["hasAccount"]),
                "Registration successfull! Please check your mail to verify OTP",
            );
        } catch (err) {
            return err;
        }
    }

    @Post("verify-account")
    @UsePipes(ValidationPipe)
    async verifyAccount(@Body() body: VerifyTokenDto) {
        try {
            const result = await this.service.verifyOpt(body);
            return successResponse(result, "User account verify successfully");
        } catch (err) {
            return err;
        }
    }

    @Post("resent-otp")
    async resentOtp(@Body() body: ResentOtpDto) {
        try {
            const result = await this.service.resnetOtp(body);
            return successResponse(result, "OTP resented please check your email and verify it");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Patch("update")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async update(@GetVerifiedUser() user: VerifiedUser, @Body() body: UpdateUserDto) {
        try {
            const result = await this.service.updateUser(user.id, body);
            return successResponse(result, "User update successfully");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Get("/me")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async me(@GetUser() user: TUser) {
        try {
            const result = await this.service.getUserById(user.userId);
            return successResponse(result, "User retrive successfully");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Post("follow-user/:id")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async followUser(@Param("id") id: string, @GetVerifiedUser() user: TUser) {
        try {
            const follow = await this.service.followUser(id, user.userId);
            return successResponse(follow, "You have successfully following");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Post("unfollow-user/:id")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async unfollowUser(@Param("id") id: string, @GetVerifiedUser() user: TUser) {
        try {
            const follow = await this.service.unfollowUser(id, user.userId);
            return successResponse(follow, "You have successfully unfollowing");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Delete("delete")
    @UsePipes(ValidationPipe)
    @UseGuards(JwtAuthGuard)
    async delete(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }

        try {
            const result = await this.service.deleteAcount(id);
            return successResponse(result, "User account deleted success");
        } catch (err) {
            return err;
        }
    }

    @ApiBearerAuth()
    @Get("allUser")
    @UseGuards(JwtAuthGuard)
    async allUser(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") {
            throw new ForbiddenException("Forbidden access");
        }
        return handleRequest(() => this.service.allUser(), "Get all user successfully");
    }
}
