/**
 * Idempotent seed for tables not covered by multiverse-seeds / demo-dummy.
 * Skips each section when that table already has rows.
 */
import {
    CallPurpose,
    CallStatus,
    CapLevel,
    CapPromotionAction,
    Feelings,
    FraudDecision,
    FraudEventType,
    IdentityVerificationType,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PayOutStatus,
    PrismaClient,
    ReportStatus,
    ReportTargetType,
    Role,
    SkyBlueNominationStatus,
    SubscriptionStatus,
    VerificationStatus,
    WithdrawStatus,
} from "@prisma/client";
import { Logger } from "@nestjs/common";

const DEMO_EMAILS = {
    amara: "amara.demo@gmail.com",
    kwame: "kwame.demo@gmail.com",
    fatima: "fatima.demo@gmail.com",
    mentor: "mentor.demo@gmail.com",
    ngoOwner: "ngo.owner.demo@gmail.com",
    corporate: "corporate.demo@gmail.com",
    student: "student.demo@gmail.com",
    sky: "sky.invite.demo@gmail.com",
} as const;

export class FullTableSeed {
    private readonly logger = new Logger(FullTableSeed.name);

    constructor(private readonly prisma: PrismaClient) {}

    async run(): Promise<void> {
        this.logger.log("🌱 Seeding remaining tables (idempotent)…");

        await this.seedPlatformSettings();
        await this.seedSuperAdmin();

        const users = await this.resolveDemoUsers();
        if (!users.amara) {
            this.logger.warn("Demo users not found — skipping relational full-table seed");
            return;
        }

        const ngo = await this.prisma.ngo.findFirst({
            where: { owner: { email: DEMO_EMAILS.ngoOwner } },
        });
        const community = await this.prisma.community.findFirst({
            where: { owner: { email: DEMO_EMAILS.amara } },
        });
        const posts = await this.prisma.post.findMany({
            where: { author: { email: { in: Object.values(DEMO_EMAILS) } } },
            take: 4,
        });
        const product = await this.prisma.product.findFirst({
            where: { seller: { email: DEMO_EMAILS.amara } },
        });
        const membership = await this.prisma.corporateMembership.findFirst({
            where: { contactEmail: "csr.partners.demo@gmail.com" },
        });
        const volunteerApp = await this.prisma.volunteerApplication.findFirst({
            where: {
                volunteer: { email: DEMO_EMAILS.amara },
                status: "ACCEPTED",
            },
        });

        await this.seedReports(users, posts);
        await this.seedFraudChecks(users);
        await this.seedSkyBlue(users);
        await this.seedCapPromotionAudits(users);
        if (ngo) await this.seedNgoVerification(ngo.id, users.mentor?.id);
        await this.seedSocialExtras(users, posts, community?.id);
        if (product) {
            await this.seedMarketplaceFinance(users, product.id, posts);
        }
        await this.seedPayoutsAndWithdraws(users);
        if (membership && users.amara) {
            await this.seedTalentUnlock(membership.id, users.amara.id);
        }
        if (volunteerApp && users.ngoOwner) {
            await this.seedVolunteerCompletion(volunteerApp.id, users.ngoOwner.id);
        }
        if (ngo && users.corporate && users.ngoOwner) {
            await this.seedDonations(users, ngo.id);
        }
        await this.seedSubscriptions(users);
        await this.seedCalls(users);
        await this.seedFileInstances(users);
        await this.seedPaymentMethods(users);
        await this.seedImpactExports(users);
        await this.seedBans(users);
        await this.seedUserNotifications();
        await this.seedLiveMessageReads(users);

        this.logger.log("✅ Full-table seed complete");
    }

    private async resolveDemoUsers() {
        const entries = await Promise.all(
            Object.entries(DEMO_EMAILS).map(async ([key, email]) => {
                const user = await this.prisma.user.findUnique({ where: { email } });
                return [key, user] as const;
            }),
        );
        return Object.fromEntries(entries) as Record<
            keyof typeof DEMO_EMAILS,
            { id: string; email: string; capLevel: CapLevel; role: Role } | null
        >;
    }

    private async seedPlatformSettings() {
        if ((await this.prisma.financialSettings.count()) === 0) {
            await this.prisma.financialSettings.create({
                data: {
                    platformCOmmission: 10,
                    MinimumPayoutAmount: 25,
                    currency: "USD",
                    autoApprovePayouts: false,
                },
            });
            this.logger.log("✅ FinancialSettings");
        }

        if ((await this.prisma.platformInformation.count()) === 0) {
            await this.prisma.platformInformation.create({
                data: {
                    platformName: "Synqulan",
                    supportEmail: "support@synqulan.com",
                    platformUrl: "https://synqulan.com",
                },
            });
            this.logger.log("✅ PlatformInformation");
        }

        if ((await this.prisma.maintenanceModel.count()) === 0) {
            await this.prisma.maintenanceModel.create({
                data: {
                    maxEventsPerCommunity: 50,
                    MaxPostPerDay: 25,
                },
            });
            this.logger.log("✅ MaintenanceModel");
        }

        const appDefaults = [
            {
                key: "min_volunteer_hours_for_black_cap",
                value: "320",
                description: "Verified volunteer hours required for Black Cap",
            },
            {
                key: "search_reindex_enabled",
                value: "true",
                description: "Allow admin search reindex",
            },
        ];

        for (const row of appDefaults) {
            await this.prisma.appSettings.upsert({
                where: { key: row.key },
                update: { value: row.value, description: row.description },
                create: row,
            });
        }
        this.logger.log("✅ AppSettings defaults");
    }

    private async seedSuperAdmin() {
        const email = process.env.SUPER_ADMIN_EMAIL ?? "superadmin@gmail.com";
        const exists = await this.prisma.user.findUnique({ where: { email } });
        if (exists) return;

        const password = process.env.SUPER_ADMIN_PASS ?? "superadmin";
        const argon2 = await import("argon2");
        const hash = await argon2.hash(password, { type: argon2.argon2id });

        await this.prisma.user.create({
            data: {
                email,
                password: hash,
                authProvider: "EMAIL",
                isVerified: true,
                role: Role.SUPER_ADMIN,
                capLevel: CapLevel.RED,
                profile: {
                    create: {
                        name: "Super Admin",
                        username: "synqulan_admin",
                        title: "Platform administrator",
                    },
                },
                metrics: { create: {} },
                NotificationToggle: { create: [{}] },
            },
        });
        this.logger.log(`✅ SUPER_ADMIN (${email})`);
    }

    private async seedReports(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
        posts: { id: string }[],
    ) {
        if ((await this.prisma.report.count()) > 0) return;

        const reporter = users.kwame!;
        const post = posts[0];
        if (!post) return;

        await this.prisma.report.createMany({
            data: [
                {
                    reporterId: reporter.id,
                    targetId: post.id,
                    targetType: ReportTargetType.POST,
                    reason: "Spam or misleading content",
                    description: "Demo report for admin moderation queue",
                    status: ReportStatus.PENDING,
                },
                {
                    reporterId: users.student!.id,
                    targetId: users.fatima?.id ?? reporter.id,
                    targetType: ReportTargetType.USER,
                    reason: "Harassment",
                    status: ReportStatus.REVIEWED,
                    reviewedById: users.mentor?.id,
                    adminNotes: "Reviewed — no action required (demo)",
                },
            ],
        });
        this.logger.log("✅ Reports");
    }

    private async seedFraudChecks(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.fraudCheck.count()) > 0) return;

        await this.prisma.fraudCheck.createMany({
            data: [
                {
                    userId: users.student!.id,
                    eventType: FraudEventType.STRIPE_ONBOARDING,
                    provider: "SEON",
                    score: 72,
                    decision: FraudDecision.QUEUE,
                    labels: { reason_codes: ["velocity", "new_device"] },
                    reason: "Elevated risk on payout onboarding",
                },
                {
                    userId: users.amara!.id,
                    eventType: FraudEventType.ACCOUNT_CHECK,
                    provider: "Sift",
                    score: 18,
                    decision: FraudDecision.ALLOW,
                    reason: "Low risk established account",
                },
            ],
        });
        this.logger.log("✅ FraudCheck");
    }

    private async seedSkyBlue(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.skyBlueNomination.count()) > 0) return;
        if (!users.sky || !users.mentor) return;

        const nomination = await this.prisma.skyBlueNomination.create({
            data: {
                nomineeId: users.sky.id,
                nominatedById: users.mentor.id,
                status: SkyBlueNominationStatus.IN_REVIEW,
                kycVerified: true,
                kycVerifiedAt: new Date(),
                kycVerifiedById: users.mentor.id,
                notabilityVerified: false,
                notabilityNotes: "Pending press references review",
            },
        });

        await this.prisma.skyBlueNominationEvent.createMany({
            data: [
                {
                    nominationId: nomination.id,
                    actorId: users.mentor.id,
                    action: "NOMINATED",
                    detail: "Black Cap mentor nominated for Sky Blue track",
                },
                {
                    nominationId: nomination.id,
                    actorId: users.mentor.id,
                    action: "KYC_VERIFIED",
                    detail: "Identity documents approved",
                },
            ],
        });
        this.logger.log("✅ SkyBlueNomination + events");
    }

    private async seedCapPromotionAudits(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
    ) {
        if ((await this.prisma.capPromotionAudit.count()) > 0) return;

        await this.prisma.capPromotionAudit.createMany({
            data: [
                {
                    userId: users.amara!.id,
                    actorId: users.mentor?.id,
                    fromLevel: CapLevel.YELLOW,
                    toLevel: CapLevel.RED,
                    action: CapPromotionAction.AUTO_PROMOTED,
                    activityScoreAtPromotion: 120,
                    volunteerHoursAtPromotion: 80,
                },
                {
                    userId: users.sky!.id,
                    actorId: users.mentor?.id,
                    fromLevel: CapLevel.BLACK,
                    toLevel: CapLevel.SKY_BLUE,
                    action: CapPromotionAction.ADMIN_PROMOTED,
                    bypassVerification: true,
                    bypassReason: "Invitation-only Sky Blue recognition (demo)",
                    reviewNotes: "Approved by platform admin",
                },
            ],
        });
        this.logger.log("✅ CapPromotionAudit");
    }

    private async seedNgoVerification(ngoId: string, reviewerId?: string) {
        if ((await this.prisma.ngoVerification.count()) > 0) return;

        await this.prisma.ngoVerification.create({
            data: {
                ngoId,
                verificationType: IdentityVerificationType.BUSINESS_CERTIFIED_AND_LICENSE,
                documents: ["https://example.com/demo/ngo-registration.pdf"],
                status: VerificationStatus.APPROVED,
                reviewedById: reviewerId,
                verificationResponse: { provider: "demo", status: "approved" },
            },
        });
        this.logger.log("✅ NgoVerification");
    }

    private async seedSocialExtras(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
        posts: { id: string }[],
        communityId?: string,
    ) {
        const post = posts[0];
        if (!post) return;

        if ((await this.prisma.location.count()) === 0) {
            await this.prisma.location.create({
                data: {
                    name: "Accra, Ghana",
                    coordinates: "5.6037,-0.1870",
                },
            });
            this.logger.log("✅ Location");
        }

        const location = await this.prisma.location.findFirst();
        let gif = await this.prisma.gif.findFirst();
        if (!gif) {
            gif = await this.prisma.gif.create({
                data: { url: "https://media.giphy.com/media/demo/synqulan-celebrate.gif" },
            });
            this.logger.log("✅ Gif");
        }

        if ((await this.prisma.postMetadata.count()) === 0) {
            const metadata = await this.prisma.postMetadata.create({
                data: {
                    feelings: Feelings.INSPIRED,
                    checkInId: location?.id,
                    gifId: gif.id,
                },
            });
            await this.prisma.post.update({
                where: { id: post.id },
                data: { metadataId: metadata.id },
            });
            this.logger.log("✅ PostMetadata");
        }

        if ((await this.prisma.postTagUser.count()) === 0 && users.kwame) {
            await this.prisma.postTagUser.create({
                data: { postId: post.id, userId: users.kwame.id },
            });
            this.logger.log("✅ PostTagUser");
        }

        if ((await this.prisma.savedPost.count()) === 0 && users.student) {
            await this.prisma.savedPost.create({
                data: { postId: post.id, userId: users.student.id },
            });
            this.logger.log("✅ SavedPost");
        }

        if ((await this.prisma.share.count()) === 0 && users.kwame) {
            await this.prisma.share.create({
                data: { postId: post.id, userId: users.kwame.id },
            });
            this.logger.log("✅ Share");
        }

        if ((await this.prisma.trendingTopic.count()) === 0) {
            const tech = await this.prisma.postCategory.findUnique({
                where: { slug: "technology" },
            });
            const now = new Date();
            await this.prisma.trendingTopic.create({
                data: {
                    keyword: "#SynqulanMentorship",
                    mentions: 128,
                    score: 94.5,
                    startDate: new Date(now.getTime() - 7 * 86400000),
                    endDate: now,
                    categoryId: tech?.id,
                },
            });
            this.logger.log("✅ TrendingTopic");
        }

        if (communityId && (await this.prisma.communityFollower.count()) === 0 && users.fatima) {
            await this.prisma.communityFollower.create({
                data: { communityId, userId: users.fatima.id },
            });
            this.logger.log("✅ CommunityFollower");
        }
    }

    private async seedMarketplaceFinance(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
        productId: string,
        posts: { id: string }[],
    ) {
        if ((await this.prisma.order.count()) === 0 && users.student) {
            const order = await this.prisma.order.create({
                data: {
                    buyerId: users.student.id,
                    productId,
                    quantity: 1,
                    totalPrice: 9.99,
                    status: OrderStatus.DELIVERED,
                    shippingAddress: "Digital delivery",
                },
            });

            await this.prisma.payment.create({
                data: {
                    orderId: order.id,
                    stripeId: "pi_demo_seed_001",
                    amount: 9.99,
                    currency: "usd",
                    status: PaymentStatus.SUCCEEDED,
                },
            });
            this.logger.log("✅ Order + Payment");
        }

        if ((await this.prisma.sellerEarnings.count()) === 0 && users.amara) {
            await this.prisma.sellerEarnings.create({
                data: {
                    sellerId: users.amara.id,
                    totalEarned: 49.95,
                    pending: 9.99,
                    totalPaid: 39.96,
                    lastPaidAt: new Date(),
                },
            });
            this.logger.log("✅ SellerEarnings");
        }

        if ((await this.prisma.wishlist.count()) === 0 && users.kwame) {
            await this.prisma.wishlist.create({
                data: { productId, userId: users.kwame.id },
            });
            this.logger.log("✅ Wishlist");
        }

        if ((await this.prisma.revenue.count()) === 0 && users.amara) {
            await this.prisma.revenue.createMany({
                data: [
                    {
                        userId: users.amara.id,
                        adId: productId,
                        amount: 2.4,
                        type: "view",
                    },
                    {
                        userId: users.amara.id,
                        adId: productId,
                        amount: 0.85,
                        type: "click",
                    },
                ],
            });
            this.logger.log("✅ Revenue");
        }

        const post = posts[0];
        if (post && (await this.prisma.dedicatedAd.count()) === 0) {
            await this.prisma.dedicatedAd.create({
                data: {
                    postId: post.id,
                    adId: productId,
                    active: true,
                },
            });
            this.logger.log("✅ DedicatedAd");
        }
    }

    private async seedPayoutsAndWithdraws(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
    ) {
        if ((await this.prisma.payout.count()) === 0 && users.amara) {
            await this.prisma.payout.createMany({
                data: [
                    {
                        userId: users.amara.id,
                        amount: 120,
                        method: PaymentMethod.STRIPE,
                        status: PayOutStatus.PAID,
                        transactionId: "po_demo_paid_001",
                        processorFee: 2.5,
                    },
                    {
                        userId: users.mentor!.id,
                        amount: 85,
                        method: PaymentMethod.STRIPE,
                        status: PayOutStatus.PENDING,
                    },
                ],
            });
            this.logger.log("✅ Payout");
        }

        if ((await this.prisma.withdraw.count()) === 0 && users.amara) {
            await this.prisma.withdraw.createMany({
                data: [
                    {
                        userId: users.amara.id,
                        amount: 50,
                        status: WithdrawStatus.SUCCESS,
                        provider: "stripe",
                        stripeTxnId: "tr_demo_success",
                    },
                    {
                        userId: users.mentor!.id,
                        amount: 30,
                        status: WithdrawStatus.PENDING,
                        provider: "stripe",
                    },
                ],
            });
            this.logger.log("✅ Withdraw");
        }
    }

    private async seedTalentUnlock(membershipId: string, candidateUserId: string) {
        if ((await this.prisma.talentCandidateUnlock.count()) > 0) return;

        await this.prisma.talentCandidateUnlock.create({
            data: { corporateMembershipId: membershipId, candidateUserId },
        });
        this.logger.log("✅ TalentCandidateUnlock");
    }

    private async seedVolunteerCompletion(applicationId: string, confirmedById: string) {
        if ((await this.prisma.volunteerCompletion.count()) > 0) return;

        await this.prisma.volunteerCompletion.create({
            data: {
                applicationId,
                ngoConfirmed: true,
                confirmationNote: "Mentorship hours verified by NGO lead",
                confirmedById,
                confirmedAt: new Date(),
            },
        });
        this.logger.log("✅ VolunteerCompletion");
    }

    private async seedDonations(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
        ngoId: string,
    ) {
        if ((await this.prisma.donationLog.count()) > 0) return;
        if (!users.corporate || !users.ngoOwner) return;

        await this.prisma.donationLog.create({
            data: {
                donorId: users.corporate.id,
                ngoId,
                ngoOwnerId: users.ngoOwner.id,
                amount: 250,
                stripeTxFrom: "ch_demo_donor",
                stripeTxTo: "tr_demo_ngo",
            },
        });
        this.logger.log("✅ DonationLog");
    }

    private async seedSubscriptions(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.subscription.count()) > 0) return;
        if (!users.student || !users.mentor) return;

        await this.prisma.subscription.create({
            data: {
                subscriberId: users.student.id,
                creatorId: users.mentor.id,
                status: SubscriptionStatus.ACTIVE,
                monthlyFee: 4.99,
                startDate: new Date(),
            },
        });
        this.logger.log("✅ Subscription");
    }

    private async seedCalls(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.calling.count()) > 0) return;
        if (!users.amara || !users.mentor) return;

        const call = await this.prisma.calling.create({
            data: {
                hostUserId: users.mentor.id,
                recipientUserId: users.amara.id,
                status: CallStatus.END,
                callPurpose: CallPurpose.MENTORSHIP,
                title: "Weekly mentorship check-in",
                startedAt: new Date(Date.now() - 3600000),
                endedAt: new Date(),
            },
        });

        await this.prisma.callParticipant.createMany({
            data: [
                {
                    callId: call.id,
                    socketId: "demo-socket-host",
                    userName: "Chidi Okonkwo",
                    hasVideo: true,
                    hasAudio: true,
                },
                {
                    callId: call.id,
                    socketId: "demo-socket-guest",
                    userName: "Amara Okafor",
                    hasVideo: true,
                    hasAudio: true,
                },
            ],
        });
        this.logger.log("✅ Calling + CallParticipant");
    }

    private async seedFileInstances(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.fileInstance.count()) > 0) return;

        await this.prisma.fileInstance.create({
            data: {
                filename: "demo-avatar.png",
                originalFilename: "avatar.png",
                path: "/uploads/demo/avatar.png",
                url: "https://cdn.synqulan.com/demo/avatar.png",
                fileType: "png",
                mimeType: "image/png",
                size: 20480,
                uploadedById: users.amara?.id,
            },
        });
        this.logger.log("✅ FileInstance");
    }

    private async seedPaymentMethods(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
    ) {
        if ((await this.prisma.paymentMethods.count()) > 0) return;
        if (!users.amara) return;

        await this.prisma.paymentMethods.create({
            data: {
                userId: users.amara.id,
                method: PaymentMethod.STRIPE,
                cardHolder: "Amara Okafor",
                cardNumber: "4242424242424242",
                expireMonth: "12",
                expireYear: "2028",
                CVC: "123",
                isDefault: true,
            },
        });
        this.logger.log("✅ PaymentMethods");
    }

    private async seedImpactExports(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.impactDataExportLog.count()) > 0) return;
        if (!users.corporate) return;

        await this.prisma.impactDataExportLog.create({
            data: {
                requestedByUserId: users.corporate.id,
                exportType: "volunteer_hours_summary",
                filters: { region: "West Africa", year: 2026 },
            },
        });
        this.logger.log("✅ ImpactDataExportLog");
    }

    private async seedBans(users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>) {
        if ((await this.prisma.ban.count()) > 0) return;

        // Inactive expired ban for audit trail demos (not blocking any active user flows)
        const fakerUser = await this.prisma.user.findFirst({
            where: { role: Role.USER, email: { notIn: Object.values(DEMO_EMAILS) } },
        });
        if (!fakerUser || !users.mentor) return;

        await this.prisma.ban.create({
            data: {
                userId: fakerUser.id,
                reason: "Demo ban record — expired",
                expiresAt: new Date(Date.now() - 86400000),
                isActive: false,
                issuedById: users.mentor.id,
            },
        });
        this.logger.log("✅ Ban");
    }

    private async seedUserNotifications() {
        if ((await this.prisma.userNotification.count()) > 0) return;

        const notification = await this.prisma.notification.findFirst({
            orderBy: { createdAt: "desc" },
        });
        if (!notification) return;

        await this.prisma.userNotification.create({
            data: {
                userId: notification.userId,
                notificationId: notification.id,
                read: false,
            },
        });
        this.logger.log("✅ UserNotification");
    }

    private async seedLiveMessageReads(
        users: Awaited<ReturnType<FullTableSeed["resolveDemoUsers"]>>,
    ) {
        if ((await this.prisma.liveMessageRead.count()) > 0) return;

        const message = await this.prisma.liveMessage.findFirst({
            include: { chat: true },
        });
        if (!message || !users.amara) return;

        await this.prisma.liveMessageRead.create({
            data: {
                messageId: message.id,
                userId: users.amara.id,
                liveChatId: message.chatId,
            },
        });
        this.logger.log("✅ LiveMessageRead");
    }
}
