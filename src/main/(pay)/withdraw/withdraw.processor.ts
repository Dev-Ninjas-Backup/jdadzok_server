import { PrismaService } from "@lib/prisma/prisma.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import Stripe from "stripe";

@Processor(QUEUE_JOB_NAME.WITHDRAW.WITHDRAW_QUEUE)
export class WithdrawProcessor extends WorkerHost {
    private stripe: Stripe;
    private logger = new Logger(WithdrawProcessor.name);

    constructor(private prisma: PrismaService) {
        super();

        const key = process.env.STRIPE_SECRET;
        if (!key) throw new Error("STRIPE_SECRET missing");

        this.stripe = new Stripe(key);
    }

    // async process(job: Job) {
    //     const { withdrawId, stripeAccountId, amount, userId } = job.data;

    //     let withdraw = null;

    //     if (withdrawId) {
    //         withdraw = await this.prisma.withdraw.findUnique({
    //             where: { id: withdrawId },
    //         });
    //         if (!withdraw) throw new Error("Withdraw not found");
    //     }

    //     const finalAmount = amount ?? withdraw?.amount ?? 0;

    //     try {
    //         const payout = await this.stripe.payouts.create(
    //             {
    //                 amount: Math.round(finalAmount * 100),
    //                 currency: "usd",
    //             },
    //             { stripeAccount: stripeAccountId },
    //         );

    //         if (withdrawId) {
    //             await this.prisma.withdraw.update({
    //                 where: { id: withdrawId },
    //                 data: {
    //                     status: "SUCCESS",
    //                     stripeTxnId: payout.id,
    //                 },
    //             });
    //         }

    //         this.logger.log(
    //             `Payout success for user ${userId ?? withdraw?.userId} amount $${finalAmount}`,
    //         );

    //         return payout;
    //     } catch (error: any) {
    //         if (withdrawId) {
    //             await this.prisma.withdraw.update({
    //                 where: { id: withdrawId },
    //                 data: {
    //                     status: "FAILED",
    //                     errorMessage: error.message,
    //                 },
    //             });
    //         }

    //         this.logger.error("Payout failed: " + error.message);
    //     }
    // }

    async process(job: Job) {
        const { withdrawId, stripeAccountId, amount, userId } = job.data;

        let withdraw = null;

        if (withdrawId) {
            withdraw = await this.prisma.withdraw.findUnique({
                where: { id: withdrawId },
            });
            if (!withdraw) throw new Error("Withdraw not found");
        }

        const finalAmount = amount ?? withdraw?.amount ?? 0;

        try {
            const payout = await this.stripe.payouts.create(
                {
                    amount: Math.round(finalAmount * 100),
                    currency: "usd",
                },
                { stripeAccount: stripeAccountId },
            );

            if (withdrawId) {
                await this.prisma.withdraw.update({
                    where: { id: withdrawId },
                    data: {
                        status: "SUCCESS",
                        stripeTxnId: payout.id,
                    },
                });
            }

            this.logger.log(
                `Payout success for user ${userId ?? withdraw?.userId} amount $${finalAmount}`,
            );

            return payout;
        } catch (error: any) {
            if (withdrawId) {
                await this.prisma.withdraw.update({
                    where: { id: withdrawId },
                    data: {
                        status: "FAILED",
                        errorMessage: error.message,
                    },
                });
            }
            this.logger.error("Payout failed: " + error.message);
        }
    }
}
