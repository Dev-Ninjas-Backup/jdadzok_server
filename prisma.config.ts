import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import type { PrismaConfig } from "prisma";

// Explicitly load environment variables
expand(config({ path: path.resolve(process.cwd(), ".env") }));

console.log("load env: ", process.env.DATABASE_URL);
export default {
    schema: path.join("prisma", "schema"),

    migrations: {
        path: path.join("prisma", "migrations"),
        // seed: "tsx prisma/seed.ts", // optional
    },
    views: {
        path: path.join("prisma", "views"),
    },
    typedSql: {
        path: path.join("prisma", "queries"),
    },
} satisfies PrismaConfig;
