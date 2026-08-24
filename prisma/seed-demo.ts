/**
 * Standalone demo dummy seed (idempotent).
 * Usage: npm run db:seed:demo
 */
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import { DemoDummySeed } from "./seeds/demo-dummy.seed";

const prisma = new PrismaClient();

async function main() {
    expand(config({ path: path.resolve(process.cwd(), ".env") }));
    console.info("===============🌱 Demo dummy seed start 🌱===============");
    await new DemoDummySeed(prisma).run();
    console.info("===============🌱 Demo dummy seed done 😍===============");
}

main()
    .catch((e) => {
        console.error(e);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
