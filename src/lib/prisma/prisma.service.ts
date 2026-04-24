import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
    extends PrismaClient<Prisma.PrismaClientOptions, "query" | "error">
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(PrismaService.name);
    // * Expose Prisma utils (enums, filters, etc.)
    readonly utils = Prisma;

    constructor() {
        super({
            log: [{ emit: "event", level: "error" }],
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.debug("🚀 Prisma connected");
    }

    async onModuleDestroy() {
        // await this.$disconnect();
        this.logger.error("🚫 Prisma disconnected");
    }
}
