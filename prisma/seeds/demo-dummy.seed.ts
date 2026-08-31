/**
 * Comprehensive Synqulan demo / dummy dataset.
 * Idempotent: skips if amara.demo@gmail.com already exists.
 *
 * Demo password for all EMAIL users: Pass123!
 * Emails use @gmail.com (required by auth validation).
 */
import * as argon2 from "argon2";
import { Logger } from "@nestjs/common";
import {
    ApplicationStatus,
    BridgeBookingSettlementStatus,
    BridgeBookingStatus,
    BridgeListingStatus,
    BridgeListingType,
    CapLevel,
    CommunityRole,
    CommunityType,
    ContributionType,
    FriendRequestStatus,
    LiveChatContext,
    LiveChatType,
    LiveMessageStatus,
    MembershipTier,
    NotificationType,
    Prisma,
    PrismaClient,
    Role,
    SponsoredTargetType,
    TrainingCohortStatus,
    TrainingCourseStatus,
    TrainingEnrollmentStatus,
    VolunteerHourSource,
    VolunteerHourVerificationStatus,
} from "@prisma/client";

const DEMO_PASSWORD = "Pass123!";
const DEMO_MARKER_EMAIL = "amara.demo@gmail.com";

type DemoUser = {
    key: string;
    email: string;
    name: string;
    username: string;
    capLevel: CapLevel;
    role?: Role;
    location: string;
    title: string;
    bio: string;
    isVolunteerMentorOptIn?: boolean;
    isTalentSearchOptIn?: boolean;
    activityScore: number;
    volunteerHours: number;
    lifetimeVerifiedVolunteerHours: number;
};

const DEMO_USERS: DemoUser[] = [
    {
        key: "amara",
        email: DEMO_MARKER_EMAIL,
        name: "Amara Okafor",
        username: "amara_okafor",
        capLevel: CapLevel.RED,
        location: "Accra, Ghana",
        title: "Software engineer & mentor",
        bio: "Building skills across Africa through mentorship and open projects.",
        isVolunteerMentorOptIn: true,
        isTalentSearchOptIn: true,
        activityScore: 180,
        volunteerHours: 148,
        lifetimeVerifiedVolunteerHours: 148,
    },
    {
        key: "kwame",
        email: "kwame.demo@gmail.com",
        name: "Kwame Mensah",
        username: "kwame_mensah",
        capLevel: CapLevel.YELLOW,
        location: "Kumasi, Ghana",
        title: "Community organiser",
        bio: "Connecting volunteers with local education projects.",
        isVolunteerMentorOptIn: true,
        activityScore: 70,
        volunteerHours: 42,
        lifetimeVerifiedVolunteerHours: 42,
    },
    {
        key: "fatima",
        email: "fatima.demo@gmail.com",
        name: "Fatima Diallo",
        username: "fatima_diallo",
        capLevel: CapLevel.GREEN,
        location: "Dakar, Senegal",
        title: "Health volunteer",
        bio: "Remote medical advice clinics and community health.",
        isVolunteerMentorOptIn: true,
        activityScore: 25,
        volunteerHours: 12,
        lifetimeVerifiedVolunteerHours: 12,
    },
    {
        key: "ngo_owner",
        email: "ngo.owner.demo@gmail.com",
        name: "Amina Traoré",
        username: "amina_ngo",
        capLevel: CapLevel.RED,
        location: "Abidjan, Côte d'Ivoire",
        title: "NGO director",
        bio: "Runs EduBridge Africa placements and CSR partnerships.",
        isVolunteerMentorOptIn: true,
        activityScore: 160,
        volunteerHours: 90,
        lifetimeVerifiedVolunteerHours: 90,
    },
    {
        key: "mentor",
        email: "mentor.demo@gmail.com",
        name: "Chidi Okonkwo",
        username: "chidi_mentor",
        capLevel: CapLevel.BLACK,
        location: "Lagos, Nigeria",
        title: "Senior mentor",
        bio: "Black Cap mentor — systems design and career coaching.",
        isVolunteerMentorOptIn: true,
        isTalentSearchOptIn: true,
        activityScore: 320,
        volunteerHours: 340,
        lifetimeVerifiedVolunteerHours: 340,
    },
    {
        key: "sky",
        email: "sky.invite.demo@gmail.com",
        name: "Naledi Molefe",
        username: "naledi_sky",
        capLevel: CapLevel.SKY_BLUE,
        location: "Johannesburg, South Africa",
        title: "Invited contributor",
        bio: "Sky Blue invitation track — high-impact recognition.",
        isVolunteerMentorOptIn: true,
        isTalentSearchOptIn: true,
        activityScore: 400,
        volunteerHours: 360,
        lifetimeVerifiedVolunteerHours: 360,
    },
    {
        key: "corporate",
        email: "corporate.demo@gmail.com",
        name: "Jordan Blake",
        username: "jordan_csr",
        capLevel: CapLevel.YELLOW,
        location: "Nairobi, Kenya",
        title: "CSR lead",
        bio: "Corporate CSR contact for Synqulan sponsorships.",
        activityScore: 55,
        volunteerHours: 8,
        lifetimeVerifiedVolunteerHours: 8,
    },
    {
        key: "student",
        email: "student.demo@gmail.com",
        name: "Reuben Olson",
        username: "reuben_olson",
        capLevel: CapLevel.GREEN,
        location: "Cape Town, South Africa",
        title: "Student mentee",
        bio: "Learning engineering with Synqulan mentors.",
        activityScore: 15,
        volunteerHours: 4,
        lifetimeVerifiedVolunteerHours: 4,
    },
];

const CAP_REQUIREMENTS: Prisma.CapRequirementsCreateInput[] = [
    {
        capLevel: CapLevel.GREEN,
        minActivityScore: 1,
        adSharePercentage: 2,
        canAccessMarketplace: false,
        canAccessVolunteerHub: false,
        canReceiveBrandDeals: false,
        requiresVerification: false,
        requiresNomination: false,
        description: "New Member - Basic visibility with 2% ad revenue share.",
    },
    {
        capLevel: CapLevel.YELLOW,
        minActivityScore: 50,
        adSharePercentage: 10,
        canAccessMarketplace: true,
        canAccessVolunteerHub: false,
        canReceiveBrandDeals: false,
        requiresVerification: false,
        requiresNomination: false,
        description: "Active Contributor - 10% ad revenue share + marketplace.",
    },
    {
        capLevel: CapLevel.RED,
        minActivityScore: 100,
        adSharePercentage: 20,
        canAccessMarketplace: true,
        canAccessVolunteerHub: true,
        canReceiveBrandDeals: false,
        requiresVerification: true,
        requiresNomination: false,
        description: "Trusted Creator - 20% share + volunteer hub.",
    },
    {
        capLevel: CapLevel.BLACK,
        minActivityScore: 100,
        minVolunteerHours: 320,
        adSharePercentage: 45,
        canAccessMarketplace: true,
        canAccessVolunteerHub: true,
        canReceiveBrandDeals: true,
        requiresVerification: true,
        requiresNomination: false,
        description: "Esteemed Contributor - 45% share after verified service.",
    },
    {
        capLevel: CapLevel.SKY_BLUE,
        minActivityScore: 100,
        minVolunteerHours: 320,
        adSharePercentage: 60,
        canAccessMarketplace: true,
        canAccessVolunteerHub: true,
        canReceiveBrandDeals: true,
        requiresVerification: true,
        requiresNomination: true,
        description: "Sky Blue — invitation-only top tier.",
    },
];

const POST_CATEGORIES = [
    { name: "Technology", slug: "technology", order: 1, color: "#2F5BFF" },
    { name: "Health", slug: "health", order: 2, color: "#16A013" },
    { name: "Education", slug: "education", order: 3, color: "#F3D000" },
    { name: "Agriculture", slug: "agriculture", order: 4, color: "#8B5A2B" },
    { name: "Arts", slug: "arts", order: 5, color: "#FF3B6B" },
];

const PRODUCT_CATEGORIES = [
    { name: "Handmade Crafts", slug: "handmade-crafts", description: "Artisan goods" },
    { name: "Digital Guides", slug: "digital-guides", description: "Downloadable resources" },
];

export class DemoDummySeed {
    private readonly logger = new Logger(DemoDummySeed.name);

    constructor(private readonly prisma: PrismaClient) {}

    async run(): Promise<void> {
        const existing = await this.prisma.user.findUnique({
            where: { email: DEMO_MARKER_EMAIL },
        });
        if (existing) {
            this.logger.warn(
                `⏭️  Demo dummy data already present (${DEMO_MARKER_EMAIL}) — skipping`,
            );
            return;
        }

        this.logger.log("🌱 Seeding comprehensive Synqulan demo dummy data…");
        const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

        await this.seedCapRequirements();
        await this.seedPostCategories();
        await this.seedProductCategories();
        await this.seedActivityScore();

        const users = await this.seedUsers(passwordHash);
        await this.seedChoicesAndUserChoices(users);
        await this.seedSocialGraph(users);
        const { ngo, community, posts } = await this.seedOrgsAndFeed(users);
        await this.seedVolunteerStack(users, ngo);
        await this.seedBridge(users);
        await this.seedTraining(users);
        await this.seedCorporate(users, ngo);
        await this.seedChat(users);
        await this.seedMarketplace(users);
        await this.seedNotifications(users);
        await this.seedAdRevenue(users);

        this.logger.log("✅ Demo dummy data seeded");
        this.logger.log(`   Login password for all demo users: ${DEMO_PASSWORD}`);
        this.logger.log(`   Marker user: ${DEMO_MARKER_EMAIL}`);
        this.logger.log(
            `   Seeded orgs: NGO=${ngo.id.slice(0, 8)}… community=${community.id.slice(0, 8)}… posts=${posts.length}`,
        );
    }

    private async seedCapRequirements() {
        for (const row of CAP_REQUIREMENTS) {
            await this.prisma.capRequirements.upsert({
                where: { capLevel: row.capLevel },
                update: row,
                create: row,
            });
        }
        this.logger.log(`✅ CapRequirements (${CAP_REQUIREMENTS.length})`);
    }

    private async seedPostCategories() {
        for (const c of POST_CATEGORIES) {
            await this.prisma.postCategory.upsert({
                where: { slug: c.slug },
                update: { name: c.name, order: c.order, color: c.color },
                create: c,
            });
        }
        this.logger.log(`✅ PostCategory (${POST_CATEGORIES.length})`);
    }

    private async seedProductCategories() {
        for (const c of PRODUCT_CATEGORIES) {
            await this.prisma.productCategory.upsert({
                where: { slug: c.slug },
                update: { name: c.name, description: c.description },
                create: c,
            });
        }
        this.logger.log(`✅ ProductCategory (${PRODUCT_CATEGORIES.length})`);
    }

    private async seedActivityScore() {
        const count = await this.prisma.activityScore.count();
        if (count > 0) return;
        await this.prisma.activityScore.create({
            data: {
                like: 1,
                comment: 2,
                share: 3,
                post: 5,
                greenCapScore: 1,
                yellowCapScore: 50,
                redCapScore: 100,
                blackCapScore: 100,
            },
        });
        this.logger.log("✅ ActivityScore weights");
    }

    private async seedUsers(passwordHash: string) {
        const map = new Map<string, { id: string; email: string; capLevel: CapLevel }>();

        for (const d of DEMO_USERS) {
            const user = await this.prisma.user.create({
                data: {
                    email: d.email,
                    password: passwordHash,
                    authProvider: "EMAIL",
                    isVerified: true,
                    role: d.role ?? Role.USER,
                    capLevel: d.capLevel,
                    profile: {
                        create: {
                            name: d.name,
                            username: d.username,
                            title: d.title,
                            bio: d.bio,
                            location: d.location,
                            avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(d.name)}`,
                            isVolunteerMentorOptIn: d.isVolunteerMentorOptIn ?? false,
                            isTalentSearchOptIn: d.isTalentSearchOptIn ?? false,
                            capArtStyle: "STRUCTURED",
                            capArtPlacement: "BESIDE",
                        },
                    },
                    about: {
                        create: {
                            location: d.location,
                            work: d.title,
                            website: `https://example.com/${d.username}`,
                        },
                    },
                    metrics: {
                        create: {
                            totalPosts: 2,
                            totalFollowers: 0,
                            totalFollowing: 0,
                            activityScore: d.activityScore,
                            volunteerHours: d.volunteerHours,
                            lifetimeVerifiedVolunteerHours: d.lifetimeVerifiedVolunteerHours,
                            totalEarnings: d.capLevel === CapLevel.GREEN ? 12 : 120,
                            currentMonthEarnings: d.capLevel === CapLevel.GREEN ? 4 : 28,
                        },
                    },
                    NotificationToggle: {
                        create: [{}],
                    },
                },
            });
            map.set(d.key, { id: user.id, email: user.email, capLevel: d.capLevel });
        }

        this.logger.log(`✅ Demo users (${map.size})`);
        return map;
    }

    private async seedChoicesAndUserChoices(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const choices = await this.prisma.choice.findMany();
        if (choices.length === 0) {
            this.logger.warn("No choices found — run choice seed first");
            return;
        }

        for (const u of users.values()) {
            const picks = choices.slice(0, 3);
            for (const c of picks) {
                await this.prisma.userChoice.upsert({
                    where: {
                        userId_choiceId: { userId: u.id, choiceId: c.id },
                    },
                    update: {},
                    create: { userId: u.id, choiceId: c.id },
                });
            }
        }
        this.logger.log("✅ UserChoice assignments");
    }

    private async seedSocialGraph(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const amara = users.get("amara")!;
        const kwame = users.get("kwame")!;
        const fatima = users.get("fatima")!;
        const mentor = users.get("mentor")!;
        const student = users.get("student")!;
        const ngoOwner = users.get("ngo_owner")!;

        const followPairs: [string, string][] = [
            [kwame.id, amara.id],
            [fatima.id, amara.id],
            [student.id, mentor.id],
            [amara.id, mentor.id],
            [amara.id, ngoOwner.id],
            [mentor.id, amara.id],
        ];

        for (const [followerId, followingId] of followPairs) {
            await this.prisma.follow.upsert({
                where: {
                    followerId_followingId: { followerId, followingId },
                },
                update: {},
                create: { followerId, followingId },
            });
        }

        // Mutual Connect (accepted FriendRequest both directions represented as one ACCEPTED)
        await this.prisma.friendRequest.create({
            data: {
                senderId: amara.id,
                receiverId: mentor.id,
                status: FriendRequestStatus.ACCEPTED,
            },
        });
        await this.prisma.friendRequest.create({
            data: {
                senderId: student.id,
                receiverId: amara.id,
                status: FriendRequestStatus.ACCEPTED,
            },
        });
        await this.prisma.friendRequest.create({
            data: {
                senderId: fatima.id,
                receiverId: kwame.id,
                status: FriendRequestStatus.PENDING,
            },
        });

        // Refresh follower counters on profiles + metrics
        for (const u of users.values()) {
            const followers = await this.prisma.follow.count({ where: { followingId: u.id } });
            const following = await this.prisma.follow.count({ where: { followerId: u.id } });
            await this.prisma.profile.update({
                where: { userId: u.id },
                data: { followersCount: followers, followingCount: following },
            });
            await this.prisma.userMetrics.update({
                where: { userId: u.id },
                data: { totalFollowers: followers, totalFollowing: following },
            });
        }

        this.logger.log("✅ Follows + FriendRequests (Connect)");
    }

    private async seedOrgsAndFeed(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const ngoOwner = users.get("ngo_owner")!;
        const amara = users.get("amara")!;
        const kwame = users.get("kwame")!;
        const mentor = users.get("mentor")!;

        const tech = await this.prisma.postCategory.findUnique({ where: { slug: "technology" } });
        const health = await this.prisma.postCategory.findUnique({ where: { slug: "health" } });

        const ngo = await this.prisma.ngo.create({
            data: {
                ownerId: ngoOwner.id,
                foundationDate: new Date("2018-03-01"),
                ngoType: CommunityType.PUBLIC,
                isVerified: true,
                capLevel: CapLevel.RED,
                likes: 42,
                profile: {
                    create: {
                        name: "EduBridge Africa",
                        username: "edubridge_africa",
                        title: "Education & skills for the diaspora",
                        bio: "NGO listing volunteer placements across West Africa.",
                        location: "Accra, Ghana",
                        avatarUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=EduBridge",
                    },
                },
                about: {
                    create: {
                        mission: "Expand access to mentorship and STEM education.",
                        website: "https://example.com/edubridge",
                    },
                },
            },
        });

        const community = await this.prisma.community.create({
            data: {
                ownerId: amara.id,
                foundationDate: new Date("2020-06-15"),
                communityType: CommunityType.PUBLIC,
                isVerified: true,
                capLevel: CapLevel.YELLOW,
                likes: 18,
                profile: {
                    create: {
                        name: "Accra Builders",
                        username: "accra_builders",
                        title: "Engineers helping engineers",
                        bio: "Weekly mentorship circles and project jams.",
                        location: "Accra, Ghana",
                    },
                },
                about: {
                    create: {
                        mission: "Peer learning for African engineers.",
                        website: "https://example.com/accra-builders",
                    },
                },
                memberships: {
                    create: [
                        { userId: amara.id, role: CommunityRole.ADMIN },
                        { userId: kwame.id, role: CommunityRole.MEMBER },
                        { userId: mentor.id, role: CommunityRole.MODERATOR },
                    ],
                },
            },
        });

        const postTexts = [
            {
                authorId: amara.id,
                text: "Just wrapped a mentorship session with three Accra engineering students — impact over vanity metrics.",
                categoryId: tech?.id,
            },
            {
                authorId: mentor.id,
                text: "Open office hours this Friday for system design reviews. Connect required for chat.",
                categoryId: tech?.id,
            },
            {
                authorId: kwame.id,
                text: "Looking for remote health advisors for a weekend clinic — apply via opportunities.",
                categoryId: health?.id,
            },
            {
                authorId: ngoOwner.id,
                text: "EduBridge Africa posted two new volunteer placements in Tamale and Accra.",
                categoryId: tech?.id,
            },
        ];

        const posts = [];
        for (const p of postTexts) {
            const post = await this.prisma.post.create({
                data: {
                    authorId: p.authorId,
                    text: p.text,
                    visibility: "PUBLIC",
                    postFrom: "REGULAR_PROFILE",
                    categoryId: p.categoryId,
                    mediaUrls: [],
                    metrics: { create: {} },
                },
            });
            posts.push(post);
        }

        // Likes + comments
        await this.prisma.like.createMany({
            data: [
                { userId: kwame.id, postId: posts[0].id },
                { userId: mentor.id, postId: posts[0].id },
                { userId: amara.id, postId: posts[1].id },
                { userId: users.get("student")!.id, postId: posts[1].id },
            ],
        });

        await this.prisma.comment.create({
            data: {
                postId: posts[0].id,
                authorId: mentor.id,
                text: "This is the energy Synqulan needs — well done Amara.",
            },
        });
        await this.prisma.comment.create({
            data: {
                postId: posts[1].id,
                authorId: amara.id,
                text: "I'll bring two mentees. Looking forward to it.",
            },
        });

        // Endorsements (recognition)
        await this.prisma.endorsement.create({
            data: {
                fromUserId: mentor.id,
                toUserId: amara.id,
                message:
                    "Outstanding mentorship this week — clear explanations and follow-through.",
            },
        });
        await this.prisma.endorsement.create({
            data: {
                fromUserId: amara.id,
                toUserId: kwame.id,
                message: "Reliable community organiser — great coordination on Accra projects.",
            },
        });

        this.logger.log("✅ NGO, Community, Posts, Likes, Comments, Endorsements");
        return { ngo, community, posts };
    }

    private async seedVolunteerStack(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
        ngo: { id: string },
    ) {
        const ngoOwner = users.get("ngo_owner")!;
        const amara = users.get("amara")!;
        const fatima = users.get("fatima")!;
        const student = users.get("student")!;
        const mentor = users.get("mentor")!;

        const project1 = await this.prisma.volunteerProject.create({
            data: {
                title: "Guide 3 engineering students in Accra",
                description:
                    "Weekly remote + in-person mentorship for junior developers. Hours count toward Cap after verification.",
                location: "Accra, Ghana",
                startDate: new Date(),
                endDate: new Date(Date.now() + 90 * 86400000),
                isActive: true,
                ngoId: ngo.id,
                createdById: ngoOwner.id,
            },
        });

        const project2 = await this.prisma.volunteerProject.create({
            data: {
                title: "Remote medical advice clinic",
                description: "Volunteer clinicians provide remote triage advice sessions.",
                location: "Remote",
                isActive: true,
                ngoId: ngo.id,
                createdById: ngoOwner.id,
            },
        });

        const appAmara = await this.prisma.volunteerApplication.create({
            data: {
                volunteerId: amara.id,
                projectId: project1.id,
                status: ApplicationStatus.ACCEPTED,
                workedHours: 24,
                confirmedById: ngoOwner.id,
            },
        });

        const appFatima = await this.prisma.volunteerApplication.create({
            data: {
                volunteerId: fatima.id,
                projectId: project2.id,
                status: ApplicationStatus.ACCEPTED,
                workedHours: 8,
                confirmedById: ngoOwner.id,
            },
        });

        await this.prisma.volunteerApplication.create({
            data: {
                volunteerId: student.id,
                projectId: project1.id,
                status: ApplicationStatus.PENDING,
            },
        });

        // Verified hours (Cap-credited)
        const verifiedHour = await this.prisma.volunteerHour.create({
            data: {
                applicationId: appAmara.id,
                loggedByUserId: amara.id,
                hours: 6,
                isVerified: true,
                verificationStatus: VolunteerHourVerificationStatus.VERIFIED,
                source: VolunteerHourSource.SELF_REPORT,
                contributionType: ContributionType.MENTORING,
                counterpartyUserId: student.id,
                counterpartyConfirmedAt: new Date(),
                endorsedByUserId: mentor.id,
                endorsedAt: new Date(),
                note: "Cohort mentoring session — Accra engineering students",
            },
        });

        await this.prisma.volunteerHour.create({
            data: {
                applicationId: appFatima.id,
                loggedByUserId: fatima.id,
                hours: 3,
                isVerified: false,
                verificationStatus: VolunteerHourVerificationStatus.PENDING,
                source: VolunteerHourSource.SELF_REPORT,
                contributionType: ContributionType.ADVICE,
                counterpartyUserId: amara.id,
                note: "Remote health advice clinic — awaiting endorsement",
            },
        });

        await this.prisma.endorsement.create({
            data: {
                fromUserId: mentor.id,
                toUserId: amara.id,
                message: "Verified mentoring hours for Accra cohort.",
                projectId: project1.id,
                volunteerHourId: verifiedHour.id,
            },
        });

        this.logger.log("✅ Volunteer projects, applications, hours");
    }

    private async seedBridge(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const amara = users.get("amara")!;
        const mentor = users.get("mentor")!;
        const corporate = users.get("corporate")!;
        const student = users.get("student")!;

        const expertise = await this.prisma.bridgeListing.create({
            data: {
                ownerId: mentor.id,
                type: BridgeListingType.EXPERTISE,
                status: BridgeListingStatus.OPEN,
                title: "System design mentoring (1:1)",
                description: "Paid or pro-bono expertise sessions. Cap-weighted discover.",
                skills: ["System Design", "Node.js", "Mentoring"],
                location: "Remote",
                remoteOk: true,
                contributionType: ContributionType.MENTORING,
                ownerCapLevel: mentor.capLevel,
                hourlyRate: 45,
                availabilityNote: "Weekday evenings GMT",
            },
        });

        const gig = await this.prisma.bridgeListing.create({
            data: {
                ownerId: amara.id,
                type: BridgeListingType.GIG,
                status: BridgeListingStatus.OPEN,
                title: "Fractional React coach for agritech startup",
                description: "Short paid gig — coach two junior engineers for 2 weeks.",
                skills: ["React", "TypeScript"],
                location: "Remote",
                remoteOk: true,
                contributionType: ContributionType.TEACHING,
                ownerCapLevel: amara.capLevel,
                budgetAmount: 800,
                currency: "USD",
                platformFeePercent: 5,
            },
        });

        await this.prisma.bridgeListing.create({
            data: {
                ownerId: corporate.id,
                type: BridgeListingType.PROJECT_HELP,
                status: BridgeListingStatus.OPEN,
                title: "Solar water scheme — PM needed",
                description: "Project seeking experienced volunteer PM in Tamale.",
                skills: ["Project Management", "Water"],
                location: "Tamale, Ghana",
                remoteOk: false,
                contributionType: ContributionType.PROJECT,
                ownerCapLevel: corporate.capLevel,
                budgetAmount: 0,
            },
        });

        await this.prisma.bridgeBooking.create({
            data: {
                listingId: expertise.id,
                clientId: student.id,
                providerId: mentor.id,
                status: BridgeBookingStatus.ACCEPTED,
                agreedAmount: 0,
                note: "Pro-bono mentorship booking",
            },
        });

        await this.prisma.bridgeBooking.create({
            data: {
                listingId: gig.id,
                clientId: corporate.id,
                providerId: amara.id,
                status: BridgeBookingStatus.COMPLETED,
                agreedAmount: 800,
                platformFeePercent: 5,
                platformFeeAmount: 40,
                providerPayoutAmount: 760,
                currency: "USD",
                settlementStatus: BridgeBookingSettlementStatus.READY,
                completedAt: new Date(),
                note: "Completed coaching gig",
            },
        });

        this.logger.log("✅ Bridge listings + bookings");
    }

    private async seedTraining(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const mentor = users.get("mentor")!;
        const amara = users.get("amara")!;
        const student = users.get("student")!;
        const fatima = users.get("fatima")!;

        const course = await this.prisma.trainingCourse.create({
            data: {
                instructorId: mentor.id,
                title: "Career-ready system design for African engineers",
                description: "Six-week cohort covering interviews, design docs, and Cap progress.",
                skills: ["System Design", "Interviews"],
                price: 49,
                currency: "USD",
                status: TrainingCourseStatus.PUBLISHED,
            },
        });

        const cohort = await this.prisma.trainingCohort.create({
            data: {
                courseId: course.id,
                title: "Accra / Remote — Sept cohort",
                startsAt: new Date(Date.now() + 7 * 86400000),
                endsAt: new Date(Date.now() + 49 * 86400000),
                capacity: 40,
                enrolledCount: 2,
                status: TrainingCohortStatus.OPEN,
            },
        });

        await this.prisma.trainingEnrollment.createMany({
            data: [
                {
                    cohortId: cohort.id,
                    studentId: student.id,
                    status: TrainingEnrollmentStatus.ENROLLED,
                    pricePaid: 49,
                    enrolledAt: new Date(),
                },
                {
                    cohortId: cohort.id,
                    studentId: fatima.id,
                    status: TrainingEnrollmentStatus.ENROLLED,
                    pricePaid: 49,
                    enrolledAt: new Date(),
                },
                {
                    cohortId: cohort.id,
                    studentId: amara.id,
                    status: TrainingEnrollmentStatus.PENDING,
                },
            ],
        });

        this.logger.log("✅ Training course / cohort / enrollments");
    }

    private async seedCorporate(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
        ngo: { id: string },
    ) {
        const corporate = users.get("corporate")!;
        const project = await this.prisma.volunteerProject.findFirst({
            where: { ngoId: ngo.id },
        });
        const listing = await this.prisma.bridgeListing.findFirst({
            where: { type: BridgeListingType.PROJECT_HELP },
        });

        const membership = await this.prisma.corporateMembership.create({
            data: {
                companyName: "Synqulan CSR Partners Ltd",
                contactEmail: "csr.partners.demo@gmail.com",
                tier: MembershipTier.GROWTH,
                isActive: true,
                contactPersonId: corporate.id,
                sdgAlignmentGoals: [4, 8, 9],
                sdgImpactSummary: "Education, decent work, and industry innovation.",
                reportedVolunteerHours: 220,
                reportedCommunityInvestment: 15000,
                esgReportPeriod: "2026-H1",
            },
        });

        if (project) {
            await this.prisma.sponsoredOpportunity.create({
                data: {
                    corporateMembershipId: membership.id,
                    targetType: SponsoredTargetType.VOLUNTEER_PROJECT,
                    volunteerProjectId: project.id,
                    title: "Sponsored: Accra engineering mentorship",
                    message: "Growth-tier CSR sponsorship for EduBridge placements.",
                    budgetAmount: 5000,
                    active: true,
                },
            });
        }

        if (listing) {
            await this.prisma.sponsoredOpportunity.create({
                data: {
                    corporateMembershipId: membership.id,
                    targetType: SponsoredTargetType.BRIDGE_LISTING,
                    bridgeListingId: listing.id,
                    title: "Sponsored: Solar water PM help",
                    budgetAmount: 2500,
                    active: true,
                },
            });
        }

        this.logger.log("✅ Corporate membership + sponsored opportunities");
    }

    private async seedChat(users: Map<string, { id: string; email: string; capLevel: CapLevel }>) {
        const amara = users.get("amara")!;
        const mentor = users.get("mentor")!;
        const student = users.get("student")!;

        const general = await this.prisma.liveChat.create({
            data: {
                type: LiveChatType.INDIVIDUAL,
                context: LiveChatContext.GENERAL,
                createdById: amara.id,
                participants: {
                    create: [{ userId: amara.id }, { userId: mentor.id }],
                },
                messages: {
                    create: [
                        {
                            senderId: amara.id,
                            content: "Hey Chidi — free for a design review Thursday?",
                            status: LiveMessageStatus.READ,
                        },
                        {
                            senderId: mentor.id,
                            content: "Absolutely. Let's lock 6pm GMT.",
                            status: LiveMessageStatus.SENT,
                        },
                    ],
                },
            },
        });

        await this.prisma.liveChat.create({
            data: {
                type: LiveChatType.INDIVIDUAL,
                context: LiveChatContext.MENTORSHIP,
                createdById: mentor.id,
                participants: {
                    create: [{ userId: mentor.id }, { userId: student.id }],
                },
                messages: {
                    create: [
                        {
                            senderId: mentor.id,
                            content:
                                "Welcome to mentorship chat — sessions here log verified hours.",
                            status: LiveMessageStatus.SENT,
                        },
                        {
                            senderId: student.id,
                            content: "Thank you! Preparing my system-design notes.",
                            status: LiveMessageStatus.SENT,
                        },
                    ],
                },
            },
        });

        void general;
        this.logger.log("✅ LiveChat (GENERAL + MENTORSHIP) + messages");
    }

    private async seedMarketplace(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const amara = users.get("amara")!;
        const category = await this.prisma.productCategory.findFirst({
            where: { slug: "digital-guides" },
        });
        if (!category) return;

        await this.prisma.product.create({
            data: {
                sellerId: amara.id,
                categoryId: category.id,
                title: "Cap progression playbook (PDF)",
                description: "How to climb Green → Black with verified hours and mentorship.",
                price: 9.99,
                location: "Digital",
                availability: 100,
                digitalFileUrl: ["https://example.com/cap-playbook.pdf"],
                isVisible: true,
            },
        });

        this.logger.log("✅ Marketplace product");
    }

    private async seedNotifications(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const amara = users.get("amara")!;
        const student = users.get("student")!;

        await this.prisma.notification.create({
            data: {
                userId: amara.id,
                type: NotificationType.CAP_UPGRADE,
                title: "Keep climbing",
                message: "You're 12 verified hours from Black Cap review eligibility.",
                read: false,
            },
        });
        await this.prisma.notification.create({
            data: {
                userId: amara.id,
                type: NotificationType.FOLLOW,
                title: "New follower",
                message: "Kwame Mensah started following you.",
                read: false,
            },
        });
        await this.prisma.notification.create({
            data: {
                userId: student.id,
                type: NotificationType.VOLUNTEER_MATCH,
                title: "Mentorship chat opened",
                message: "Your mentorship thread with Chidi is ready.",
                read: true,
            },
        });

        this.logger.log("✅ Notifications");
    }

    private async seedAdRevenue(
        users: Map<string, { id: string; email: string; capLevel: CapLevel }>,
    ) {
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        for (const u of [users.get("amara")!, users.get("mentor")!, users.get("sky")!]) {
            const share =
                u.capLevel === CapLevel.SKY_BLUE ? 60 : u.capLevel === CapLevel.BLACK ? 45 : 20;
            await this.prisma.adRevenueShare.upsert({
                where: {
                    userId_month_year: { userId: u.id, month, year },
                },
                update: {},
                create: {
                    userId: u.id,
                    month,
                    year,
                    amount: share * 2.4,
                    capLevelAtTime: u.capLevel,
                    sharePercentage: share,
                },
            });
        }

        this.logger.log("✅ AdRevenueShare rows");
    }
}
