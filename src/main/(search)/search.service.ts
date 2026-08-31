import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { BridgeListingStatus, PostVisibility } from "@prisma/client";
import { capDisplayLabel } from "@common/utils/cap-earning-headline.util";
import {
    ALL_SEARCH_ENTITY_TYPES,
    SEARCH_PROVIDER_TOKEN,
    SearchEntityType,
    SearchProviderName,
} from "./search.constants";
import { SearchProvider } from "./providers/search-provider.interface";
import { SearchQueryDto } from "./dto/search.dto";
import { SearchSyncService } from "./search-sync.service";

@Injectable()
export class SearchService {
    constructor(
        @Inject(SEARCH_PROVIDER_TOKEN) private readonly provider: SearchProvider,
        private readonly sync: SearchSyncService,
        private readonly prisma: PrismaService,
    ) {}

    status() {
        return {
            provider: this.provider.name,
            enabled: this.provider.name !== SearchProviderName.OFF,
            indexedTypes: ALL_SEARCH_ENTITY_TYPES,
            note: "Postgres remains source of truth; vendor owns ranking.",
        };
    }

    async search(query: SearchQueryDto, opts?: { authenticated: boolean }) {
        if (this.provider.name === SearchProviderName.OFF) {
            throw new ServiceUnavailableException(
                "Search is disabled (SEARCH_PROVIDER=off). Configure Typesense or Algolia.",
            );
        }

        const guestSafe = query.guest === true || !opts?.authenticated;
        const types = this.parseTypes(query.types);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const vendor = await this.provider.search({
            q: (query.q || "").trim(),
            types,
            guestSafe,
            page,
            limit,
            location: query.location,
            capLevel: query.capLevel,
        });

        const idsByType = {
            [SearchEntityType.MEMBER]: [] as string[],
            [SearchEntityType.OPPORTUNITY]: [] as string[],
            [SearchEntityType.BRIDGE]: [] as string[],
            [SearchEntityType.NGO]: [] as string[],
            [SearchEntityType.COMMUNITY]: [] as string[],
            [SearchEntityType.POST]: [] as string[],
        };
        for (const hit of vendor.hits) {
            idsByType[hit.entityType].push(hit.id);
        }

        const [members, opportunities, bridge, ngos, communities, posts] = await Promise.all([
            this.hydrateMembers(idsByType[SearchEntityType.MEMBER], guestSafe),
            this.hydrateOpportunities(idsByType[SearchEntityType.OPPORTUNITY], guestSafe),
            this.hydrateBridge(idsByType[SearchEntityType.BRIDGE], guestSafe),
            this.hydrateNgos(idsByType[SearchEntityType.NGO]),
            this.hydrateCommunities(idsByType[SearchEntityType.COMMUNITY]),
            this.hydratePosts(idsByType[SearchEntityType.POST], guestSafe),
        ]);

        const maps = {
            [SearchEntityType.MEMBER]: new Map(members.map((m) => [m.id, m])),
            [SearchEntityType.OPPORTUNITY]: new Map(opportunities.map((o) => [o.id, o])),
            [SearchEntityType.BRIDGE]: new Map(bridge.map((b) => [b.id, b])),
            [SearchEntityType.NGO]: new Map(ngos.map((n) => [n.id, n])),
            [SearchEntityType.COMMUNITY]: new Map(communities.map((c) => [c.id, c])),
            [SearchEntityType.POST]: new Map(posts.map((p) => [p.id, p])),
        };

        const results = vendor.hits
            .map((hit) => {
                const data = maps[hit.entityType].get(hit.id);
                if (!data) return null;
                return { type: hit.entityType, score: hit.score, data };
            })
            .filter(Boolean);

        return {
            provider: this.provider.name,
            guestSafe,
            query: query.q || "",
            found: vendor.found,
            page,
            limit,
            results,
        };
    }

    async reindex() {
        return this.sync.reindexAll();
    }

    private parseTypes(raw?: string): SearchEntityType[] {
        if (!raw?.trim()) return [...ALL_SEARCH_ENTITY_TYPES];
        const parts = raw.split(",").map((s) => s.trim().toLowerCase());
        const alias: Record<string, SearchEntityType> = {
            member: SearchEntityType.MEMBER,
            members: SearchEntityType.MEMBER,
            opportunity: SearchEntityType.OPPORTUNITY,
            opportunities: SearchEntityType.OPPORTUNITY,
            bridge: SearchEntityType.BRIDGE,
            ngo: SearchEntityType.NGO,
            ngos: SearchEntityType.NGO,
            community: SearchEntityType.COMMUNITY,
            communities: SearchEntityType.COMMUNITY,
            post: SearchEntityType.POST,
            posts: SearchEntityType.POST,
            org: SearchEntityType.NGO,
            orgs: SearchEntityType.NGO,
        };
        const types: SearchEntityType[] = [];
        for (const p of parts) {
            const t = alias[p];
            if (t && !types.includes(t)) types.push(t);
        }
        return types.length ? types : [...ALL_SEARCH_ENTITY_TYPES];
    }

    private async hydrateMembers(ids: string[], guestSafe: boolean) {
        if (!ids.length) return [];
        const users = await this.prisma.user.findMany({
            where: {
                id: { in: ids },
                bans: { none: { isActive: true } },
                profile: { isNot: null },
            },
            select: {
                id: true,
                capLevel: true,
                profile: {
                    select: {
                        name: true,
                        username: true,
                        title: true,
                        bio: true,
                        avatarUrl: true,
                        location: true,
                        isVolunteerMentorOptIn: true,
                    },
                },
                userChoices: { include: { choice: { select: { text: true } } } },
            },
        });
        const byId = new Map(users.map((u) => [u.id, u]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((u) => {
                const profile = u!.profile!;
                return {
                    id: u!.id,
                    displayName: profile.name,
                    username: profile.username,
                    title: profile.title,
                    bio: guestSafe ? (profile.bio || "").slice(0, 280) : profile.bio,
                    avatarUrl: profile.avatarUrl,
                    location: profile.location,
                    cap: { level: u!.capLevel, label: capDisplayLabel(u!.capLevel) },
                    skills: u!.userChoices.map((c) => c.choice.text),
                    volunteerOptIn: profile.isVolunteerMentorOptIn,
                };
            });
    }

    private async hydrateOpportunities(ids: string[], guestSafe: boolean) {
        if (!ids.length) return [];
        const projects = await this.prisma.volunteerProject.findMany({
            where: { id: { in: ids }, ...(guestSafe ? { isActive: true } : {}) },
            select: {
                id: true,
                title: true,
                description: true,
                location: true,
                startDate: true,
                endDate: true,
                isActive: true,
                createdAt: true,
                ngo: {
                    select: {
                        id: true,
                        isVerified: true,
                        profile: { select: { name: true, avatarUrl: true } },
                    },
                },
            },
        });
        const byId = new Map(projects.map((p) => [p.id, p]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((p) => ({
                id: p!.id,
                title: p!.title,
                description: guestSafe ? (p!.description || "").slice(0, 400) : p!.description,
                location: p!.location,
                startDate: p!.startDate,
                endDate: p!.endDate,
                isActive: p!.isActive,
                createdAt: p!.createdAt,
                org: {
                    id: p!.ngo.id,
                    name: p!.ngo.profile?.name || null,
                    avatarUrl: p!.ngo.profile?.avatarUrl || null,
                    verifiedPartner: p!.ngo.isVerified,
                },
            }));
    }

    private async hydrateBridge(ids: string[], guestSafe: boolean) {
        if (!ids.length) return [];
        const rows = await this.prisma.bridgeListing.findMany({
            where: {
                id: { in: ids },
                ...(guestSafe ? { status: BridgeListingStatus.OPEN } : {}),
            },
            select: {
                id: true,
                type: true,
                status: true,
                title: true,
                description: true,
                skills: true,
                location: true,
                remoteOk: true,
                ownerCapLevel: true,
                contributionType: true,
                hourlyRate: true,
                budgetAmount: true,
                currency: true,
                createdAt: true,
                owner: {
                    select: {
                        id: true,
                        profile: { select: { name: true, username: true, avatarUrl: true } },
                    },
                },
            },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => ({
                id: r!.id,
                type: r!.type,
                status: r!.status,
                title: r!.title,
                description: guestSafe ? (r!.description || "").slice(0, 400) : r!.description,
                skills: r!.skills,
                location: r!.location,
                remoteOk: r!.remoteOk,
                contributionType: r!.contributionType,
                ownerCapLevel: r!.ownerCapLevel,
                hourlyRate: r!.hourlyRate,
                budgetAmount: r!.budgetAmount,
                currency: r!.currency,
                createdAt: r!.createdAt,
                owner: {
                    id: r!.owner.id,
                    name: r!.owner.profile?.name || null,
                    username: r!.owner.profile?.username || null,
                    avatarUrl: r!.owner.profile?.avatarUrl || null,
                },
            }));
    }

    private async hydrateNgos(ids: string[]) {
        if (!ids.length) return [];
        const rows = await this.prisma.ngo.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                ngoType: true,
                isVerified: true,
                capLevel: true,
                likes: true,
                profile: {
                    select: {
                        name: true,
                        username: true,
                        title: true,
                        bio: true,
                        avatarUrl: true,
                        location: true,
                        followersCount: true,
                    },
                },
            },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => ({
                id: r!.id,
                ngoType: r!.ngoType,
                isVerified: r!.isVerified,
                capLevel: r!.capLevel,
                likes: r!.likes,
                profile: r!.profile,
            }));
    }

    private async hydrateCommunities(ids: string[]) {
        if (!ids.length) return [];
        const rows = await this.prisma.community.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                communityType: true,
                isVerified: true,
                capLevel: true,
                likes: true,
                profile: {
                    select: {
                        name: true,
                        username: true,
                        title: true,
                        bio: true,
                        avatarUrl: true,
                        location: true,
                        followersCount: true,
                    },
                },
            },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => ({
                id: r!.id,
                communityType: r!.communityType,
                isVerified: r!.isVerified,
                capLevel: r!.capLevel,
                likes: r!.likes,
                profile: r!.profile,
            }));
    }

    private async hydratePosts(ids: string[], guestSafe: boolean) {
        if (!ids.length) return [];
        const rows = await this.prisma.post.findMany({
            where: {
                id: { in: ids },
                ...(guestSafe ? { visibility: PostVisibility.PUBLIC, isHidden: false } : {}),
            },
            select: {
                id: true,
                text: true,
                mediaUrls: true,
                mediaType: true,
                visibility: true,
                createdAt: true,
                author: {
                    select: {
                        id: true,
                        profile: { select: { name: true, username: true, avatarUrl: true } },
                    },
                },
                category: { select: { id: true, name: true, slug: true } },
                community: {
                    select: { id: true, profile: { select: { name: true } } },
                },
                ngo: { select: { id: true, profile: { select: { name: true } } } },
            },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        return ids
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => ({
                id: r!.id,
                text: guestSafe ? (r!.text || "").slice(0, 400) : r!.text,
                mediaUrls: r!.mediaUrls,
                mediaType: r!.mediaType,
                visibility: r!.visibility,
                createdAt: r!.createdAt,
                author: {
                    id: r!.author.id,
                    name: r!.author.profile?.name || null,
                    username: r!.author.profile?.username || null,
                    avatarUrl: r!.author.profile?.avatarUrl || null,
                },
                category: r!.category,
                community: r!.community
                    ? { id: r!.community.id, name: r!.community.profile?.name || null }
                    : null,
                ngo: r!.ngo ? { id: r!.ngo.id, name: r!.ngo.profile?.name || null } : null,
            }));
    }
}
