import { ENVEnum } from "@common/enum/env.enum";
import { SharedBullAsyncConfiguration } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";

export const buillQueueConfig: SharedBullAsyncConfiguration = {
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => ({
        connection: {
            host: configService.get(ENVEnum.REDIS_HOST) || "redis",
            port: configService.get(ENVEnum.REDIS_PORT) || 6379,
        },
        defaultJobOptions: {
            attempts: 3,
        },
    }),
};
