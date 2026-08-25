import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { capDisplayLabel } from "@common/utils/cap-earning-headline.util";
import {
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
            indexedTypes: [SearchEntityType.MEMBER, SearchEntityType.OPPORTUNITY],
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

        const memberIds = vendor.hits
            .filter((h) => h.entityType === SearchEntityType.MEMBER)
            .map((h) => h.id);
        const opportunityIds = vendor.hits
            .filter((h) => h.entityType === SearchEntityType.OPPORTUNITY)
            .map((h) => h.id);

        const [members, opportunities] = await Promise.all([
            this.hydrateMembers(memberIds, guestSafe),
            this.hydrateOpportunities(opportunityIds, guestSafe),
        ]);

        const memberMap = new Map(members.map((m) => [m.id, m]));
        const opportunityMap = new Map(opportunities.map((o) => [o.id, o]));

        const results = vendor.hits
            .map((hit) => {
                if (hit.entityType === SearchEntityType.MEMBER) {
                    const data = memberMap.get(hit.id);
                    if (!data) return null;
                    return { type: SearchEntityType.MEMBER, score: hit.score, data };
                }
                const data = opportunityMap.get(hit.id);
                if (!data) return null;
                return { type: SearchEntityType.OPPORTUNITY, score: hit.score, data };
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
        if (!raw?.trim()) {
            return [SearchEntityType.MEMBER, SearchEntityType.OPPORTUNITY];
        }
        const parts = raw.split(",").map((s) => s.trim().toLowerCase());
        const types: SearchEntityType[] = [];
        for (const p of parts) {
            if (p === SearchEntityType.MEMBER) types.push(SearchEntityType.MEMBER);
            if (p === SearchEntityType.OPPORTUNITY) types.push(SearchEntityType.OPPORTUNITY);
        }
        return types.length
            ? types
            : [SearchEntityType.MEMBER, SearchEntityType.OPPORTUNITY];
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
                userChoices: {
                    include: { choice: { select: { text: true } } },
                },
            },
        });

        // Preserve vendor ranking order
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
                    bio: guestSafe
                        ? (profile.bio || "").slice(0, 280)
                        : profile.bio,
                    avatarUrl: profile.avatarUrl,
                    location: profile.location,
                    cap: {
                        level: u!.capLevel,
                        label: capDisplayLabel(u!.capLevel),
                    },
                    skills: u!.userChoices.map((c) => c.choice.text),
                    volunteerOptIn: profile.isVolunteerMentorOptIn,
                    // Explicitly never leak private fields
                };
            });
    }

    private async hydrateOpportunities(ids: string[], guestSafe: boolean) {
        if (!ids.length) return [];

        const projects = await this.prisma.volunteerProject.findMany({
            where: {
                id: { in: ids },
                ...(guestSafe ? { isActive: true } : {}),
            },
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
                description: guestSafe
                    ? (p!.description || "").slice(0, 400)
                    : p!.description,
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
}
