/**
 * Seed platform settings + all remaining tables (idempotent).
 * Usage: npm run db:seed:full
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import { FullTableSeed } from "./seeds/full-table.seed";

const prisma = new PrismaClient();

async function main() {
    expand(config({ path: path.resolve(process.cwd(), ".env") }));
    console.info("===============🌱 Full table seed start 🌱===============");
    await new FullTableSeed(prisma).run();
    console.info("===============🌱 Full table seed done 😍===============");
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
