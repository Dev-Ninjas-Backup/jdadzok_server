import { Inject, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { BridgeListingStatus, PostVisibility } from "@prisma/client";
import { CAP_RANK, SEARCH_PROVIDER_TOKEN, SearchEntityType } from "./search.constants";
import {
    CatalogSearchDocument,
    MemberSearchDocument,
    ReindexStats,
    SearchDocument,
} from "./search-document.types";
import { SearchProvider } from "./providers/search-provider.interface";

const BIO_SNIPPET_LEN = 280;
const DESC_SNIPPET_LEN = 400;
const BATCH_SIZE = 100;

@Injectable()
export class SearchSyncService {
    private readonly logger = new Logger(SearchSyncService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(SEARCH_PROVIDER_TOKEN) private readonly provider: SearchProvider,
    ) {}

    get providerName(): string {
        return this.provider.name;
    }

    async ensureSchema(): Promise<void> {
        await this.provider.ensureSchema();
    }

    async upsertMember(userId: string): Promise<void> {
        const doc = await this.buildMemberDocument(userId);
        if (!doc) {
            await this.provider.delete(SearchEntityType.MEMBER, userId);
            return;
        }
        await this.provider.upsert([doc]);
    }

    async deleteMember(userId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.MEMBER, userId);
    }

    async upsertOpportunity(projectId: string): Promise<void> {
        await this.upsertCatalog(SearchEntityType.OPPORTUNITY, projectId, () =>
            this.buildOpportunityDocument(projectId),
        );
    }

    async deleteOpportunity(projectId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.OPPORTUNITY, projectId);
    }

    async upsertBridge(listingId: string): Promise<void> {
        await this.upsertCatalog(SearchEntityType.BRIDGE, listingId, () =>
            this.buildBridgeDocument(listingId),
        );
    }

    async deleteBridge(listingId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.BRIDGE, listingId);
    }

    async upsertNgo(ngoId: string): Promise<void> {
        await this.upsertCatalog(SearchEntityType.NGO, ngoId, () => this.buildNgoDocument(ngoId));
    }

    async deleteNgo(ngoId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.NGO, ngoId);
    }

    async upsertCommunity(communityId: string): Promise<void> {
        await this.upsertCatalog(SearchEntityType.COMMUNITY, communityId, () =>
            this.buildCommunityDocument(communityId),
        );
    }

    async deleteCommunity(communityId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.COMMUNITY, communityId);
    }

    async upsertPost(postId: string): Promise<void> {
        await this.upsertCatalog(SearchEntityType.POST, postId, () =>
            this.buildPostDocument(postId),
        );
    }

    async deletePost(postId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.POST, postId);
    }

    async reindexAll(): Promise<ReindexStats> {
        await this.provider.ensureSchema();

        const members = await this.reindexMembers();
        const opportunities = await this.reindexLoop(
            (cursor) =>
                this.prisma.volunteerProject.findMany({
                    select: { id: true },
                    take: BATCH_SIZE,
                    ...(cursor
                        ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" as const } }
                        : { orderBy: { id: "asc" as const } }),
                }),
            (id) => this.buildOpportunityDocument(id),
        );
        const bridge = await this.reindexLoop(
            (cursor) =>
                this.prisma.bridgeListing.findMany({
                    select: { id: true },
                    take: BATCH_SIZE,
                    ...(cursor
                        ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" as const } }
                        : { orderBy: { id: "asc" as const } }),
                }),
            (id) => this.buildBridgeDocument(id),
        );
        const ngos = await this.reindexLoop(
            (cursor) =>
                this.prisma.ngo.findMany({
                    select: { id: true },
                    take: BATCH_SIZE,
                    ...(cursor
                        ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" as const } }
                        : { orderBy: { id: "asc" as const } }),
                }),
            (id) => this.buildNgoDocument(id),
        );
        const communities = await this.reindexLoop(
            (cursor) =>
                this.prisma.community.findMany({
                    select: { id: true },
                    take: BATCH_SIZE,
                    ...(cursor
                        ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" as const } }
                        : { orderBy: { id: "asc" as const } }),
                }),
            (id) => this.buildCommunityDocument(id),
        );
        const posts = await this.reindexLoop(
            (cursor) =>
                this.prisma.post.findMany({
                    where: { visibility: PostVisibility.PUBLIC, isHidden: false },
                    select: { id: true },
                    take: BATCH_SIZE,
                    ...(cursor
                        ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" as const } }
                        : { orderBy: { id: "asc" as const } }),
                }),
            (id) => this.buildPostDocument(id),
        );

        const stats: ReindexStats = {
            members,
            opportunities,
            bridge,
            ngos,
            communities,
            posts,
            provider: this.provider.name,
        };
        this.logger.log(`Reindex complete via ${this.provider.name}: ${JSON.stringify(stats)}`);
        return stats;
    }

    private async reindexMembers(): Promise<number> {
        let count = 0;
        let cursor: string | undefined;
        for (;;) {
            const users = await this.prisma.user.findMany({
                where: {
                    profile: { isNot: null },
                    bans: { none: { isActive: true } },
                },
                select: { id: true },
                take: BATCH_SIZE,
                ...(cursor
                    ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" as const } }
                    : { orderBy: { id: "asc" as const } }),
            });
            if (!users.length) break;
            const docs: SearchDocument[] = [];
            for (const u of users) {
                const doc = await this.buildMemberDocument(u.id);
                if (doc) docs.push(doc);
            }
            if (docs.length) await this.provider.upsert(docs);
            count += docs.length;
            cursor = users[users.length - 1].id;
            if (users.length < BATCH_SIZE) break;
        }
        return count;
    }

    private async reindexLoop(
        fetchPage: (cursor?: string) => Promise<{ id: string }[]>,
        build: (id: string) => Promise<SearchDocument | null>,
    ): Promise<number> {
        let count = 0;
        let cursor: string | undefined;
        for (;;) {
            const rows = await fetchPage(cursor);
            if (!rows.length) break;
            const docs: SearchDocument[] = [];
            for (const row of rows) {
                const doc = await build(row.id);
                if (doc) docs.push(doc);
            }
            if (docs.length) await this.provider.upsert(docs);
            count += docs.length;
            cursor = rows[rows.length - 1].id;
            if (rows.length < BATCH_SIZE) break;
        }
        return count;
    }

    private async upsertCatalog(
        type: SearchEntityType,
        id: string,
        build: () => Promise<SearchDocument | null>,
    ) {
        const doc = await build();
        if (!doc) {
            await this.provider.delete(type, id);
            return;
        }
        await this.provider.upsert([doc]);
    }

    async buildMemberDocument(userId: string): Promise<MemberSearchDocument | null> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                bans: { where: { isActive: true }, take: 1 },
                userChoices: { include: { choice: { select: { text: true } } } },
            },
        });

        if (!user?.profile) return null;
        if (user.bans.length > 0) return null;

        return {
            id: user.id,
            entityType: SearchEntityType.MEMBER,
            displayName: user.profile.name,
            username: user.profile.username,
            bioSnippet: (user.profile.bio || "").slice(0, BIO_SNIPPET_LEN),
            skills: user.userChoices.map((c) => c.choice.text).filter(Boolean),
            capLevel: user.capLevel,
            capRank: CAP_RANK[user.capLevel] ?? CAP_RANK.NONE,
            location: user.profile.location || "",
            volunteerOptIn: user.profile.isVolunteerMentorOptIn,
            isPublic: true,
        };
    }

    async buildOpportunityDocument(projectId: string): Promise<CatalogSearchDocument | null> {
        const project = await this.prisma.volunteerProject.findUnique({
            where: { id: projectId },
            include: {
                ngo: {
                    select: {
                        isVerified: true,
                        profile: { select: { name: true } },
                    },
                },
            },
        });
        if (!project) return null;

        return {
            id: project.id,
            entityType: SearchEntityType.OPPORTUNITY,
            title: project.title,
            descriptionSnippet: (project.description || "").slice(0, DESC_SNIPPET_LEN),
            orgName: project.ngo.profile?.name || "",
            location: project.location || "",
            skills: [],
            tags: [],
            listingType: "VOLUNTEER_PROJECT",
            verifiedPartner: project.ngo.isVerified,
            isActive: project.isActive,
            isPublic: project.isActive,
            capRank: project.ngo.isVerified ? 200 : 100,
        };
    }

    async buildBridgeDocument(listingId: string): Promise<CatalogSearchDocument | null> {
        const listing = await this.prisma.bridgeListing.findUnique({
            where: { id: listingId },
            include: {
                owner: { select: { profile: { select: { name: true, username: true } } } },
            },
        });
        if (!listing) return null;

        const isPublic = listing.status === BridgeListingStatus.OPEN;
        return {
            id: listing.id,
            entityType: SearchEntityType.BRIDGE,
            title: listing.title,
            descriptionSnippet: (listing.description || "").slice(0, DESC_SNIPPET_LEN),
            orgName: listing.owner.profile?.name || listing.owner.profile?.username || "",
            location: listing.location || (listing.remoteOk ? "Remote" : ""),
            skills: listing.skills ?? [],
            tags: listing.contributionType ? [listing.contributionType] : [],
            listingType: listing.type,
            verifiedPartner: false,
            isActive: isPublic,
            isPublic,
            capRank: CAP_RANK[listing.ownerCapLevel] ?? CAP_RANK.NONE,
        };
    }

    async buildNgoDocument(ngoId: string): Promise<CatalogSearchDocument | null> {
        const ngo = await this.prisma.ngo.findUnique({
            where: { id: ngoId },
            include: {
                profile: true,
                about: { select: { mission: true, location: true } },
            },
        });
        if (!ngo?.profile) return null;

        const aboutText = ngo.about?.mission || ngo.profile.bio || ngo.profile.title || "";

        return {
            id: ngo.id,
            entityType: SearchEntityType.NGO,
            title: ngo.profile.name,
            descriptionSnippet: aboutText.slice(0, DESC_SNIPPET_LEN),
            orgName: ngo.profile.name,
            location: ngo.profile.location || ngo.about?.location || "",
            skills: [],
            tags: [ngo.ngoType],
            listingType: ngo.ngoType,
            verifiedPartner: ngo.isVerified,
            isActive: true,
            isPublic: true,
            capRank: (CAP_RANK[ngo.capLevel] ?? CAP_RANK.NONE) + (ngo.isVerified ? 50 : 0),
        };
    }

    async buildCommunityDocument(communityId: string): Promise<CatalogSearchDocument | null> {
        const community = await this.prisma.community.findUnique({
            where: { id: communityId },
            include: {
                profile: true,
                about: { select: { mission: true, location: true } },
            },
        });
        if (!community?.profile) return null;

        const aboutText =
            community.about?.mission || community.profile.bio || community.profile.title || "";

        return {
            id: community.id,
            entityType: SearchEntityType.COMMUNITY,
            title: community.profile.name,
            descriptionSnippet: aboutText.slice(0, DESC_SNIPPET_LEN),
            orgName: community.profile.name,
            location: community.profile.location || community.about?.location || "",
            skills: [],
            tags: [community.communityType],
            listingType: community.communityType,
            verifiedPartner: community.isVerified,
            isActive: true,
            isPublic: true,
            capRank:
                (CAP_RANK[community.capLevel] ?? CAP_RANK.NONE) + (community.isVerified ? 50 : 0),
        };
    }

    async buildPostDocument(postId: string): Promise<CatalogSearchDocument | null> {
        const post = await this.prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: { select: { profile: { select: { name: true, username: true } } } },
                category: { select: { name: true } },
                community: { select: { profile: { select: { name: true } } } },
                ngo: { select: { profile: { select: { name: true } } } },
            },
        });
        if (!post) return null;

        const isPublic = post.visibility === PostVisibility.PUBLIC && !post.isHidden;
        const orgName =
            post.ngo?.profile?.name ||
            post.community?.profile?.name ||
            post.author.profile?.name ||
            "";

        return {
            id: post.id,
            entityType: SearchEntityType.POST,
            title: (post.text || "").slice(0, 120) || "Post",
            descriptionSnippet: (post.text || "").slice(0, DESC_SNIPPET_LEN),
            orgName,
            location: "",
            skills: [],
            tags: post.category?.name ? [post.category.name] : [],
            listingType: post.visibility,
            verifiedPartner: false,
            isActive: isPublic,
            isPublic,
            capRank: 100,
        };
    }
}
