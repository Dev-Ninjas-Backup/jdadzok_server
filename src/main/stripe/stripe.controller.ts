import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import {
    Body,
    Controller,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Ip,
    Post,
    Req,
    UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { VerifiedUser } from "@type/shared.types";
import { StripeService } from "./stripe.service";
import { Request } from "express";

@Controller("stripe")
export class StripeController {
    constructor(private readonly stripeService: StripeService) {}

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post("create-account")
    createAccount(@GetVerifiedUser() user: VerifiedUser, @Req() req: Request, @Ip() ip: string) {
        const clientIp =
            (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ip || undefined;
        return this.stripeService.createExpressAccount(user.id, clientIp);
    }

    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("account")
    getAccount(@GetVerifiedUser() user: VerifiedUser) {
        return this.stripeService.getExpressAccount(user.id);
    }

    @Post("webhook")
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Headers("stripe-signature") signature: string,
        @Body() body: Buffer, // raw body for Stripe verification
    ) {
        try {
            this.stripeService.handleWebhook(body, signature);
            return { received: true };
        } catch (error) {
            return { received: false, error: error.message };
        }
    }
}
