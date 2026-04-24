import { Module } from "@nestjs/common";
import { StripeController } from "./stripe.controller";
import { StripeService } from "./stripe.service";
import { PrismaService } from "@lib/prisma/prisma.service";
import Stripe from "stripe";

@Module({
    controllers: [StripeController],
    providers: [
        StripeService,
        PrismaService,
        {
            provide: "STRIPE_CLIENT",
            useFactory: () =>
                new Stripe(process.env.STRIPE_SECRET!, { apiVersion: "2025-10-29.clover" }),
        },
    ],
    exports: [StripeService],
})
export class StripeModule {}
