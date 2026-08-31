import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import { DemoDummySeed } from "./seeds/demo-dummy.seed";
import { FullTableSeed } from "./seeds/full-table.seed";
import { Seeds } from "./seeds/multiverse-seeds";

// Explicitly load environment variables
const prisma = new PrismaClient();

async function main() {
    expand(config({ path: path.resolve(process.cwd(), ".env") }));
    console.info("===============🌱 Database Seed start 🌱===============");
    const seed = new Seeds(prisma);

    // ============LIST OF SEED START============= //
    await seed.user();
    await seed.choice();
    await seed.aboutUs();
    await seed.privacyPolicy();
    await seed.termsAndConditions();
    await new DemoDummySeed(prisma).run();
    await new FullTableSeed(prisma).run();
    // ============LIST OF SEED END============= //

    console.info("===============🌱 Database Seed successfully 😍===============");
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
