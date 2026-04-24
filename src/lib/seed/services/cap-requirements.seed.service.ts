import { CapLevel } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { Injectable } from "@nestjs/common";

interface CapLevelConfig {
    capLevel: CapLevel;
    minActivityScore?: number;
    minVolunteerHours?: number;
    requiresVerification: boolean;
    requiresNomination: boolean;
    adSharePercentage: number;
    canAccessMarketplace: boolean;
    canAccessVolunteerHub: boolean;
    canReceiveBrandDeals: boolean;
    description: string;
}

@Injectable()
export class CapRequirementsSeedService {
    constructor(private readonly prisma: PrismaService) {}

    private readonly capLevelConfigs: CapLevelConfig[] = [
        {
            capLevel: "GREEN",
            minActivityScore: 1, // Just need to sign up and post
            adSharePercentage: 2,
            canAccessMarketplace: false,
            canAccessVolunteerHub: false,
            canReceiveBrandDeals: false,
            requiresVerification: false,
            requiresNomination: false,
            description:
                "New Member - Basic visibility with 2% ad revenue share. Welcome to the community!",
        },
        {
            capLevel: "YELLOW",
            minActivityScore: 50,
            adSharePercentage: 10,
            canAccessMarketplace: true,
            canAccessVolunteerHub: false,
            canReceiveBrandDeals: false,
            requiresVerification: false,
            requiresNomination: false,
            description:
                "Active Contributor - Enhanced reach with 10% ad revenue share and marketplace access.",
        },
        {
            capLevel: "RED",
            minActivityScore: 100,
            adSharePercentage: 20,
            canAccessMarketplace: true,
            canAccessVolunteerHub: true,
            canReceiveBrandDeals: false,
            requiresVerification: true, // Admin verification required
            requiresNomination: false,
            description:
                "Trusted Creator - 20% ad revenue share with volunteer hub access. Requires admin verification.",
        },
        {
            capLevel: "BLACK",
            minActivityScore: 100,
            minVolunteerHours: 320, // 8 weeks * 40 hours = 320 hours minimum
            adSharePercentage: 45,
            canAccessMarketplace: true,
            canAccessVolunteerHub: true,
            canReceiveBrandDeals: true,
            requiresVerification: true,
            requiresNomination: false,
            description:
                "Esteemed Contributor - 45% ad revenue share with high visibility. Must complete 8-week volunteer service.",
        },
        {
            capLevel: "OSTRICH_FEATHER",
            minActivityScore: 100,
            minVolunteerHours: 320,
            adSharePercentage: 60,
            canAccessMarketplace: true,
            canAccessVolunteerHub: true,
            canReceiveBrandDeals: true,
            requiresVerification: true,
            requiresNomination: true, // Secret panel nomination required
            description:
                "Global Changemaker - 60% ad revenue share, brand deals, and global recognition. Requires panel nomination.",
        },
    ];

    async seedCapRequirements(): Promise<void> {
        console.info("🌱 Seeding CapRequirements...");

        try {
            // Check if data already exists
            const existingCount = await this.prisma.capRequirements.count();

            if (existingCount > 0) {
                console.info("✅ CapRequirements already seeded, updating existing records...");
                await this.updateExistingCapRequirements();
                return;
            }

            // Create all cap requirements
            const results = await this.prisma.$transaction(async (tx) => {
                const createdRequirements = [];

                for (const config of this.capLevelConfigs) {
                    const requirement = await tx.capRequirements.create({
                        data: config,
                    });
                    createdRequirements.push(requirement);
                }

                return createdRequirements;
            });

            console.info(`✅ Successfully created ${results.length} CapRequirements`);
        } catch (error) {
            console.error("❌ Error seeding CapRequirements:", error);
            throw error;
        }
    }

    private async updateExistingCapRequirements(): Promise<void> {
        try {
            await this.prisma.$transaction(async (tx) => {
                for (const config of this.capLevelConfigs) {
                    await tx.capRequirements.upsert({
                        where: { capLevel: config.capLevel },
                        update: config,
                        create: config,
                    });
                }
            });

            console.info("✅ CapRequirements updated successfully");
        } catch (error) {
            console.error("❌ Error updating CapRequirements:", error);
            throw error;
        }
    }

    async getCapRequirement(capLevel: CapLevel) {
        return await this.prisma.capRequirements.findUnique({
            where: { capLevel },
        });
    }

    async getAllCapRequirements() {
        return await this.prisma.capRequirements.findMany({
            orderBy: [{ capLevel: "asc" }],
        });
    }

    async resetCapRequirements(): Promise<void> {
        console.info("🔄 Resetting CapRequirements...");

        try {
            await this.prisma.capRequirements.deleteMany();
            await this.seedCapRequirements();
            console.info("✅ CapRequirements reset successfully");
        } catch (error) {
            console.error("❌ Error resetting CapRequirements:", error);
            throw error;
        }
    }
}
