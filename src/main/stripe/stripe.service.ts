import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

import { PaymentStatus } from "@prisma/client";
import { ApiResponse } from "./utils/api-response";
@Injectable()
export class StripeService {
    private readonly logger = new Logger(StripeService.name);
    private readonly stripe: Stripe;
    private readonly webhookSecret: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        const stripeSecret = this.configService.getOrThrow<string>("STRIPE_SECRET");
        this.webhookSecret = this.configService.getOrThrow<string>("STRIPE_WEBHOOK_SECRET");
        this.stripe = new Stripe(stripeSecret);
    }

    async createExpressAccount(userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                include: {
                    profile: true,
                    about: true,
                },
            });

            if (!user) throw new NotFoundException("User not found");

            const account = await this.stripe.accounts.create({
                type: "express",
                country: "US",
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: "individual",
                metadata: { userId, email: user.email },
            });

            await this.prisma.user.update({
                where: { id: userId },
                data: { stripeAccountId: account.id },
            });

            const link = await this.stripe.accountLinks.create({
                account: account.id,
                refresh_url: "https://example.com/refresh",
                return_url: "https://example.com/return",
                type: "account_onboarding",
            });

            return ApiResponse.success("Stripe account created", { url: link.url });
        } catch (error) {
            this.logger.error(error);
            return ApiResponse.error(
                "Stripe account creation failed",
                error instanceof Error ? error.message : "Unknown error",
            );
        }
    }
    async getExpressAccount(userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { stripeAccountId: true },
            });

            if (!user?.stripeAccountId) {
                throw new NotFoundException("Stripe account not found for this user");
            }

            const account = await this.stripe.accounts.retrieve(user.stripeAccountId);
            const balance = await this.stripe.balance.retrieve({
                stripeAccount: user.stripeAccountId,
            });

            return ApiResponse.success("Stripe account retrieved", {
                id: account.id,
                email: account.email,
                type: account.type,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                details_submitted: account.details_submitted,
                capabilities: account.capabilities,
                business_type: account.business_type,
                balance,
            });
        } catch (error) {
            this.logger.error(error);
            return ApiResponse.error(
                "Failed to retrieve Stripe account",
                error instanceof Error ? error.message : "Unknown error",
            );
        }
    }

    async handleWebhook(rawBody: Buffer, signature: string) {
        try {
            const event: Stripe.Event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                this.webhookSecret,
            );

            this.logger.log(`Received Stripe event: ${event.type}`);

            switch (event.type) {
                case "payment_intent.succeeded": {
                    const paymentIntent = event.data.object;

                    const orderId = paymentIntent.metadata.orderId;
                    if (!orderId) {
                        const msg = "PaymentIntent metadata missing orderId";
                        this.logger.error(msg);
                        return ApiResponse.error(msg);
                    }

                    const order = await this.prisma.order.findUnique({
                        where: { id: orderId },
                        include: {
                            product: { include: { seller: true } },
                        },
                    });

                    if (!order) {
                        const msg = `Order not found: ${orderId}`;
                        this.logger.error(msg);
                        return ApiResponse.error(msg);
                    }

                    await this.prisma.order.update({
                        where: { id: orderId },
                        data: { status: "PAID" },
                    });

                    const product = await this.prisma.product.findUnique({
                        where: { id: order.productId },
                    });

                    if (!product) throw new NotFoundException("Product is not found.");

                    const dedicatedUsers = await this.prisma.dedicatedAd.findMany({
                        where: { adId: product.id },
                        include: {
                            post: {
                                include: {
                                    author: {
                                        select: {
                                            id: true,
                                            capLevel: true,
                                        },
                                    },
                                },
                            },
                        },
                    });

                    if (!dedicatedUsers || dedicatedUsers.length === 0)
                        throw new NotFoundException("No dedicated ad users found.");

                    const adminActivity = await this.prisma.activityScore.findFirst();

                    for (const user of dedicatedUsers) {
                        const author = user.post.author;

                        let percentage = 0;

                        switch (author.capLevel) {
                            case "GREEN":
                                percentage = adminActivity?.greenCapPromtionFee ?? 0;
                                break;
                            case "YELLOW":
                                percentage = adminActivity?.yeallowCapPromtionFee ?? 0;
                                break;
                            case "BLACK":
                                percentage = adminActivity?.blackCapPromtionFee ?? 0;
                                break;
                            case "RED":
                                percentage = adminActivity?.redCapPromtionFee ?? 0;
                                break;
                        }

                        await this.prisma.profile.update({
                            where: { userId: author.id },
                            data: {
                                balance: {
                                    increment: product.promotionFee * percentage,
                                },
                            },
                        });
                    }

                    await this.prisma.payment.updateMany({
                        where: { orderId },
                        data: { status: PaymentStatus.SUCCEEDED },
                    });

                    const applicationFee = paymentIntent.application_fee_amount ?? 0;
                    const receivedBySeller = paymentIntent.amount_received - applicationFee;

                    this.logger.log(
                        `Payment complete:
                    Order: ${orderId}
                    Buyer Paid: ${paymentIntent.amount} cents
                    Seller Received: ${receivedBySeller} cents
                    Platform Fee: ${applicationFee} cents`,
                    );

                    return ApiResponse.success("Payment processed successfully");
                }

                default: {
                    const msg = `Unhandled Stripe event type: ${event.type}`;
                    this.logger.warn(msg);
                    return ApiResponse.success(msg);
                }
            }
        } catch (err: any) {
            const msg = `Error processing Stripe webhook: ${err.message}`;
            this.logger.error(msg);
            return ApiResponse.error(msg);
        }
    }
}
