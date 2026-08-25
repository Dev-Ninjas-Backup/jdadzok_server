import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@lib/prisma/prisma.service";
import { CAP_RANK, SearchEntityType } from "./search.constants";
import {
    MemberSearchDocument,
    OpportunitySearchDocument,
    SearchDocument,
} from "./search-document.types";
import { SearchProvider } from "./providers/search-provider.interface";
import { Inject } from "@nestjs/common";
import { SEARCH_PROVIDER_TOKEN } from "./search.constants";

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
        const doc = await this.buildOpportunityDocument(projectId);
        if (!doc) {
            await this.provider.delete(SearchEntityType.OPPORTUNITY, projectId);
            return;
        }
        await this.provider.upsert([doc]);
    }

    async deleteOpportunity(projectId: string): Promise<void> {
        await this.provider.delete(SearchEntityType.OPPORTUNITY, projectId);
    }

    /** Full reindex of members + opportunities from Postgres. */
    async reindexAll(): Promise<{ members: number; opportunities: number; provider: string }> {
        await this.provider.ensureSchema();

        let members = 0;
        let opportunities = 0;
        let cursor: string | undefined;

        // Members with profiles (banned users excluded)
        for (;;) {
            const users = await this.prisma.user.findMany({
                where: {
                    profile: { isNot: null },
                    bans: { none: { isActive: true } },
                },
                select: { id: true },
                take: BATCH_SIZE,
                ...(cursor
                    ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" } }
                    : { orderBy: { id: "asc" } }),
            });
            if (!users.length) break;

            const docs: SearchDocument[] = [];
            for (const u of users) {
                const doc = await this.buildMemberDocument(u.id);
                if (doc) docs.push(doc);
            }
            if (docs.length) await this.provider.upsert(docs);
            members += docs.length;
            cursor = users[users.length - 1].id;
            if (users.length < BATCH_SIZE) break;
        }

        cursor = undefined;
        for (;;) {
            const projects: Array<{ id: string }> = await this.prisma.volunteerProject.findMany({
                select: { id: true },
                take: BATCH_SIZE,
                ...(cursor
                    ? { skip: 1, cursor: { id: cursor }, orderBy: { id: "asc" } }
                    : { orderBy: { id: "asc" } }),
            });
            if (!projects.length) break;

            const docs: SearchDocument[] = [];
            for (const p of projects) {
                const doc = await this.buildOpportunityDocument(p.id);
                if (doc) docs.push(doc);
            }
            if (docs.length) await this.provider.upsert(docs);
            opportunities += docs.length;
            cursor = projects[projects.length - 1].id;
            if (projects.length < BATCH_SIZE) break;
        }

        this.logger.log(
            `Reindex complete via ${this.provider.name}: ${members} members, ${opportunities} opportunities`,
        );
        return { members, opportunities, provider: this.provider.name };
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

        const skills = user.userChoices.map((c) => c.choice.text).filter(Boolean);
        const bio = (user.profile.bio || "").slice(0, BIO_SNIPPET_LEN);

        return {
            id: user.id,
            entityType: SearchEntityType.MEMBER,
            displayName: user.profile.name,
            username: user.profile.username,
            bioSnippet: bio,
            skills,
            capLevel: user.capLevel,
            capRank: CAP_RANK[user.capLevel] ?? CAP_RANK.NONE,
            location: user.profile.location || "",
            volunteerOptIn: user.profile.isVolunteerMentorOptIn,
            // Profiles with a username are discoverable (guest-safe public subset).
            isPublic: true,
        };
    }

    async buildOpportunityDocument(
        projectId: string,
    ): Promise<OpportunitySearchDocument | null> {
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
            verifiedPartner: project.ngo.isVerified,
            isActive: project.isActive,
            isPublic: project.isActive,
            capRank: project.ngo.isVerified ? 200 : 100,
        };
    }
}
