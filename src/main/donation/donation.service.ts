import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { DonationDto } from "./dto/donation.dto";

@Injectable()
export class DonationService {
    private stripe = new Stripe(process.env.STRIPE_SECRET!);

    constructor(private prisma: PrismaService) {}

    async donateToNgo(donorId: string, dto: DonationDto) {
        const { ngoId, amount } = dto;
        // 1. Fetch donor
        const donor = await this.prisma.user.findUnique({
            where: { id: donorId },
        });

        if (!donor) throw new BadRequestException("Donor not found");

        if (!donor.stripeAccountId) {
            throw new BadRequestException(
                "Doner is not ready to donetion. please add stripe account.",
            );
        }

        // 2. Fetch NGO + owner
        const ngo = await this.prisma.ngo.findUnique({
            where: { id: ngoId },
            include: { owner: true },
        });

        if (!ngo) throw new BadRequestException("NGO not found");
        if (!ngo.owner?.stripeAccountId)
            throw new BadRequestException("NGO owner has no Stripe account");

        const ngoOwnerStripeAccount = ngo.owner.stripeAccountId;

        // ================================================
        // Step 1 — PaymentIntent (Donor → Platform)
        // ================================================

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount,
            currency: "usd",
            metadata: {
                donorId,
                ngoId,
            },
            transfer_group: "ngo-donation",
        });

        //  DO NOT use transfer with destination=null — Stripe does not allow that!
        // ================================================
        // Step 2 — After payment succeeds → Transfer (Platform → NGO owner)
        // ================================================

        const transfer = await this.stripe.transfers.create({
            amount,
            currency: "usd",
            destination: ngoOwnerStripeAccount,
            transfer_group: "ngo-donation",
        });

        // ================================================
        // Step 3 — Log donation
        // ================================================

        await this.prisma.donationLog.create({
            data: {
                donorId,
                ngoId,
                ngoOwnerId: ngo.ownerId,
                amount,
                stripeTxFrom: paymentIntent.id,
                stripeTxTo: transfer.id,
            },
        });

        return {
            message: "Donation sent successfully",
            paymentIntentSecret: paymentIntent.client_secret,
            transfer,
        };
    }

    // View all donations by a donor
    async getDonorDonations(donorId: string) {
        return this.prisma.donationLog.findMany({
            where: { donorId },
            orderBy: { createdAt: "desc" },
            include: { ngo: true, ngoOwner: true },
        });
    }

    // View total donations received by a specific NGO
    async getNgoDonations(ngoId: string) {
        const donations = await this.prisma.donationLog.findMany({
            where: { ngoId },
        });

        const totalAmount = donations.reduce((sum, d) => sum + d.amount, 0);

        return {
            totalAmount,
            donations,
        };
    }
}
