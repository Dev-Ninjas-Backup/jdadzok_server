import { PrismaService } from "@lib/prisma/prisma.service";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import {
    BridgeBookingStatus,
    BridgeListingStatus,
    BridgeListingType,
    CapLevel,
    Prisma,
} from "@prisma/client";
import {
    isContributionOther,
    resolveOtherText,
} from "@common/utils/other-option.util";
import {
    BridgeListQueryDto,
    CreateBridgeBookingDto,
    CreateBridgeListingDto,
    RespondBridgeBookingDto,
    UpdateBridgeListingDto,
} from "./dto/bridge.dto";
import { ChatService } from "@module/(sockets)/chats/chat.service";

/** Higher Caps get more Bridge visibility (descending weight). */
const CAP_VISIBILITY_WEIGHT: Record<CapLevel, number> = {
    SKY_BLUE: 600,
    BLACK: 500,
    RED: 400,
    YELLOW: 300,
    GREEN: 200,
    NONE: 100,
};

@Injectable()
export class BridgeService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly chatService: ChatService,
    ) {}

    async createListing(ownerId: string, dto: CreateBridgeListingDto) {
        this.validateListingPayload(dto);

        const contributionOther = resolveOtherText({
            isOther: isContributionOther(dto.contributionType),
            otherText: dto.contributionOther,
            label: "contributionOther",
        });

        const owner = await this.prisma.user.findUnique({
            where: { id: ownerId },
            select: { id: true, capLevel: true },
        });
        if (!owner) {
            throw new NotFoundException("User not found");
        }

        return this.prisma.bridgeListing.create({
            data: {
                ownerId,
                type: dto.type,
                status: dto.status ?? BridgeListingStatus.OPEN,
                title: dto.title,
                description: dto.description,
                skills: dto.skills ?? [],
                location: dto.location,
                remoteOk: dto.remoteOk ?? true,
                ownerCapLevel: owner.capLevel,
                contributionType: dto.contributionType,
                contributionOther,
                hourlyRate: dto.hourlyRate,
                availabilityNote: dto.availabilityNote,
                budgetAmount: dto.budgetAmount,
                currency: dto.currency ?? "USD",
                platformFeePercent: dto.platformFeePercent ?? 5,
            },
            include: this.listingInclude(),
        });
    }

    async updateListing(ownerId: string, listingId: string, dto: UpdateBridgeListingDto) {
        const listing = await this.requireOwnedListing(ownerId, listingId);

        if (dto.type && dto.type !== listing.type) {
            throw new BadRequestException("Cannot change listing type after creation");
        }

        const merged = { ...listing, ...dto };
        this.validateListingPayload({
            type: listing.type,
            title: merged.title,
            description: merged.description,
            hourlyRate: merged.hourlyRate ?? undefined,
            budgetAmount: merged.budgetAmount ?? undefined,
        });

        const owner = await this.prisma.user.findUnique({
            where: { id: ownerId },
            select: { capLevel: true },
        });

        const nextType = dto.contributionType ?? listing.contributionType;
        const contributionOther =
            dto.contributionType !== undefined || dto.contributionOther !== undefined
                ? resolveOtherText({
                      isOther: isContributionOther(nextType),
                      otherText:
                          dto.contributionOther !== undefined
                              ? dto.contributionOther
                              : listing.contributionOther,
                      label: "contributionOther",
                  })
                : undefined;

        return this.prisma.bridgeListing.update({
            where: { id: listingId },
            data: {
                ...(dto.title !== undefined && { title: dto.title }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.skills !== undefined && { skills: dto.skills }),
                ...(dto.location !== undefined && { location: dto.location }),
                ...(dto.remoteOk !== undefined && { remoteOk: dto.remoteOk }),
                ...(dto.status !== undefined && { status: dto.status }),
                ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
                ...(dto.availabilityNote !== undefined && {
                    availabilityNote: dto.availabilityNote,
                }),
                ...(dto.budgetAmount !== undefined && { budgetAmount: dto.budgetAmount }),
                ...(dto.currency !== undefined && { currency: dto.currency }),
                ...(dto.platformFeePercent !== undefined && {
                    platformFeePercent: dto.platformFeePercent,
                }),
                ...(dto.contributionType !== undefined && {
                    contributionType: dto.contributionType,
                }),
                ...(contributionOther !== undefined && { contributionOther }),
                // Refresh Cap snapshot so ranking stays current
                ownerCapLevel: owner?.capLevel ?? listing.ownerCapLevel,
            },
            include: this.listingInclude(),
        });
    }

    async getListing(listingId: string) {
        const listing = await this.prisma.bridgeListing.findUnique({
            where: { id: listingId },
            include: this.listingInclude(),
        });
        if (!listing) {
            throw new NotFoundException("Bridge listing not found");
        }
        return {
            ...listing,
            visibilityWeight: CAP_VISIBILITY_WEIGHT[listing.ownerCapLevel] ?? 0,
        };
    }

    async listMine(ownerId: string) {
        return this.prisma.bridgeListing.findMany({
            where: { ownerId },
            include: this.listingInclude(),
            orderBy: { updatedAt: "desc" },
        });
    }

    /**
     * Cap-weighted discovery: higher Caps rank first among OPEN listings.
     * (In-memory sort after fetch keeps scaffold simple; can move to SQL later.)
     */
    async listDiscover(query: BridgeListQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const where: Prisma.BridgeListingWhereInput = {
            status: query.status ?? BridgeListingStatus.OPEN,
            ...(query.type && { type: query.type }),
            ...(query.skill && { skills: { has: query.skill } }),
            ...(query.contributionType && { contributionType: query.contributionType }),
            ...(query.otherText && {
                OR: [
                    {
                        contributionOther: {
                            contains: query.otherText,
                            mode: "insensitive",
                        },
                    },
                    { title: { contains: query.otherText, mode: "insensitive" } },
                    { description: { contains: query.otherText, mode: "insensitive" } },
                    { skills: { has: query.otherText } },
                ],
            }),
        };

        const [rows, total] = await Promise.all([
            this.prisma.bridgeListing.findMany({
                where,
                include: this.listingInclude(),
                // Pull a wider window then Cap-sort; page within ranked set
                take: Math.min(500, skip + limit + 50),
            }),
            this.prisma.bridgeListing.count({ where }),
        ]);

        const ranked = rows
            .map((row) => ({
                ...row,
                visibilityWeight: CAP_VISIBILITY_WEIGHT[row.ownerCapLevel] ?? 0,
            }))
            .sort((a, b) => {
                if (b.visibilityWeight !== a.visibilityWeight) {
                    return b.visibilityWeight - a.visibilityWeight;
                }
                return b.createdAt.getTime() - a.createdAt.getTime();
            });

        const items = ranked.slice(skip, skip + limit);

        return {
            items,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
            ranking: "cap_weighted",
        };
    }

    async createBooking(clientId: string, listingId: string, dto: CreateBridgeBookingDto) {
        const listing = await this.prisma.bridgeListing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            throw new NotFoundException("Bridge listing not found");
        }
        if (listing.status !== BridgeListingStatus.OPEN) {
            throw new BadRequestException("Listing is not open for booking");
        }
        if (listing.ownerId === clientId) {
            throw new BadRequestException("You cannot book your own listing");
        }
        if (listing.type === BridgeListingType.EXPERTISE && dto.agreedAmount == null) {
            // allow hourly negotiate later; agreedAmount optional for expertise
        }
        if (
            (listing.type === BridgeListingType.GIG ||
                listing.type === BridgeListingType.PROJECT_HELP) &&
            listing.budgetAmount == null &&
            dto.agreedAmount == null
        ) {
            throw new BadRequestException("agreedAmount is required when listing has no budget");
        }

        return this.prisma.bridgeBooking.create({
            data: {
                listingId,
                clientId,
                providerId: listing.ownerId,
                agreedAmount: dto.agreedAmount ?? listing.budgetAmount ?? listing.hourlyRate,
                note: dto.note,
                status: BridgeBookingStatus.PENDING,
            },
            include: {
                listing: true,
                client: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
                provider: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
            },
        });
    }

    async respondBooking(providerId: string, bookingId: string, dto: RespondBridgeBookingDto) {
        const booking = await this.prisma.bridgeBooking.findUnique({
            where: { id: bookingId },
        });
        if (!booking) {
            throw new NotFoundException("Booking not found");
        }
        if (booking.providerId !== providerId) {
            throw new ForbiddenException("Only the listing owner can respond to this booking");
        }
        if (booking.status !== BridgeBookingStatus.PENDING) {
            throw new BadRequestException(`Booking is already ${booking.status}`);
        }

        const status =
            dto.action === "ACCEPTED"
                ? BridgeBookingStatus.ACCEPTED
                : BridgeBookingStatus.DECLINED;

        const updated = await this.prisma.bridgeBooking.update({
            where: { id: bookingId },
            data: { status },
        });

        if (status === BridgeBookingStatus.ACCEPTED) {
            await this.chatService.openMentorshipChatForBridgeBooking(bookingId);
        }

        return updated;
    }

    async listMyBookings(userId: string) {
        return this.prisma.bridgeBooking.findMany({
            where: {
                OR: [{ clientId: userId }, { providerId: userId }],
            },
            include: {
                listing: true,
                client: {
                    select: {
                        id: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
                provider: {
                    select: {
                        id: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    private async requireOwnedListing(ownerId: string, listingId: string) {
        const listing = await this.prisma.bridgeListing.findUnique({
            where: { id: listingId },
        });
        if (!listing) {
            throw new NotFoundException("Bridge listing not found");
        }
        if (listing.ownerId !== ownerId) {
            throw new ForbiddenException("You do not own this Bridge listing");
        }
        return listing;
    }

    private validateListingPayload(
        dto: Pick<CreateBridgeListingDto, "type" | "title" | "description"> & {
            hourlyRate?: number | null;
            budgetAmount?: number | null;
        },
    ) {
        if (!dto.type) {
            throw new BadRequestException("type is required");
        }
        if (dto.type === BridgeListingType.EXPERTISE && dto.hourlyRate == null) {
            // soft: expertise can omit rate; OK for scaffold
        }
        if (
            (dto.type === BridgeListingType.GIG || dto.type === BridgeListingType.PROJECT_HELP) &&
            dto.budgetAmount != null &&
            dto.budgetAmount < 0
        ) {
            throw new BadRequestException("budgetAmount must be >= 0");
        }
    }

    private listingInclude() {
        return {
            owner: {
                select: {
                    id: true,
                    email: true,
                    capLevel: true,
                    profile: { select: { name: true, avatarUrl: true, username: true } },
                },
            },
        } as const;
    }
}
