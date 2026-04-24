import { faker } from "@faker-js/faker";
import { Logger } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { DefaultArgs } from "@prisma/client/runtime/library";
import { preChoices } from "./constants";
import { createUser } from "./user/createUser";

type TPrimsa = PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;
export class Seeds {
    private logger = new Logger(Seeds.name);
    private prisma: TPrimsa;
    constructor(prisma: TPrimsa) {
        this.prisma = prisma;
    }

    public user = async (count = 10) => {
        const userPromises = Array.from({ length: count }).map(
            async () => await createUser(this.prisma),
        );
        const users = await Promise.all(userPromises);
        this.logger.log(`✅ Seeded ${users.length} users`);
    };

    public choice = async () => {
        await this.prisma.choice.createMany({
            data: preChoices,
            skipDuplicates: true,
        });
        this.logger.log(`✅ Seeded ${preChoices.length} choice`);
    };

    public aboutUs = async () => {
        const exists = await this.prisma.aboutUs.findFirst();
        if (exists) return; // Skip if already seeded

        const data: Prisma.AboutUsCreateInput = {
            about: faker.lorem.paragraphs(2),
            photos: [faker.image.url(), faker.image.url()],
        };

        await this.prisma.aboutUs.create({ data });
        this.logger.log(`✅ Seeded About us`);
    };

    public privacyPolicy = async () => {
        const exists = await this.prisma.privacyPolicy.findFirst();
        if (exists) return;

        await this.prisma.privacyPolicy.create({
            data: {
                text: `# Privacy Policy\n\n${faker.lorem.paragraphs(3)}`,
            },
        });
        this.logger.log(`✅ Seeded Privacy Policy`);
    };

    public termsAndConditions = async () => {
        const exists = await this.prisma.termsAndConditions.findFirst();
        if (exists) return;

        await this.prisma.termsAndConditions.create({
            data: {
                text: `# Terms and Conditions\n\n${faker.lorem.paragraphs(3)}`,
            },
        });
        this.logger.log(`✅ Seeded Terms & conditions`);
    };
}
