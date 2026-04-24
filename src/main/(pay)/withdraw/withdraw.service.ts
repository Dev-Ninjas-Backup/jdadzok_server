import { PrismaService } from "@lib/prisma/prisma.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { InjectQueue } from "@nestjs/bullmq";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import Stripe from "stripe";

@Injectable()
export class WithdrawService {
    private stripe: Stripe;

    constructor(
        private prisma: PrismaService,
        private config: ConfigService,
        @InjectQueue(QUEUE_JOB_NAME.WITHDRAW.WITHDRAW_QUEUE)
        private withdrawQueue: Queue,
    ) {
        const secretKey = process.env.STRIPE_SECRET;
        if (!secretKey) throw new Error("STRIPE_SECRET not configured");

        this.stripe = new Stripe(secretKey);
    }

    // USER manually requests withdraw (adds to queue)
    // async requestWithdraw(userId: string, dto: { amount: number }) {
    //     const user = await this.prisma.user.findUnique({
    //         where: { id: userId },
    //         select: { stripeAccountId: true },
    //     });

    //     if (!user || !user.stripeAccountId) {
    //         throw new BadRequestException("User has no Stripe Express Account");
    //     }

    //     // Save withdraw request
    //     const withdraw = await this.prisma.withdraw.create({
    //         data: {
    //             userId: userId,
    //             amount: dto.amount,
    //             status: "PENDING",
    //         },
    //     });

    //     // Add job to queue
    //     await this.withdrawQueue.add("process-withdraw", {
    //         withdrawId: withdraw.id,
    //         stripeAccountId: user.stripeAccountId,
    //     });

    //     return { message: "Withdraw request queued", withdrawId: withdraw.id };
    // }

    // // monthly auto withdraw (15 date)
    // async enqueueMonthlyWithdraws() {
    //     const users = await this.prisma.user.findMany({
    //         where: {
    //             revenues: { some: { amount: { gt: 0 } } },
    //         },
    //         include: { revenues: true },
    //     });

    //     for (const user of users) {
    //         const total = user.revenues.reduce((a, r) => a + r.amount, 0);

    //         await this.withdrawQueue.add("process-withdraw", {
    //             userId: user.id,
    //             amount: total,
    //             stripeAccountId: user.stripeAccountId,
    //         });
    //     }

    //     return { message: "Monthly withdraw queued" };
    // }

    async requestWithdraw(userId: string, dto: { amount: number }, options?: { delayMs?: number }) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                stripeAccountId: true,
                profile: {
                    select: {
                        balance: true,
                    },
                },
            },
        });

        if (!user?.stripeAccountId) {
            throw new BadRequestException("User has no Stripe Express Account");
        }

        // // Check minimum balance
        // if (!user.profile || user.profile.balance < 100) {
        //     throw new BadRequestException("Insufficient balance. Minimum balance required: $100");
        // }

        // // Optional: Check if requested amount is more than balance
        // if (dto.amount > user.profile.balance) {
        //     throw new BadRequestException("Requested amount exceeds available balance");
        // }

        // Save withdraw request
        const withdraw = await this.prisma.withdraw.create({
            data: {
                userId,
                amount: dto.amount,
                status: "PENDING",
            },
        });

        // Add job to queue with optional delay
        await this.withdrawQueue.add(
            "process-withdraw",
            {
                withdrawId: withdraw.id,
                stripeAccountId: user.stripeAccountId,
            },
            {
                delay: options?.delayMs ?? 0,
            },
        );
        return { message: "Withdraw request queued", withdrawId: withdraw.id };
    }

    // monthly auto withdraw (15 date)
    async enqueueMonthlyWithdraws(options?: { testDelayMs?: number }) {
        const users = await this.prisma.user.findMany({
            where: {
                revenues: { some: { amount: { gt: 0 } } },
            },
            include: { revenues: true },
        });

        for (const user of users) {
            const total = user.revenues.reduce((a, r) => a + r.amount, 0);

            if (!user.stripeAccountId) continue;

            await this.withdrawQueue.add(
                "process-withdraw",
                {
                    userId: user.id,
                    amount: total,
                    stripeAccountId: user.stripeAccountId,
                },
                {
                    delay: options?.testDelayMs ?? 0,
                },
            );
        }

        return { message: "Monthly withdraw queued" };
    }
}
