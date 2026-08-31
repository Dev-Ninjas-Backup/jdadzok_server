import { Module, Logger, Inject, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@lib/prisma/prisma.module";
import { FraudController } from "./fraud.controller";
import { FraudService } from "./fraud.service";
import { fraudProviderFactory } from "./providers/fraud-provider.factory";
import { FRAUD_PROVIDER_TOKEN, FraudProviderName } from "./fraud.constants";
import { FraudProvider } from "./providers/fraud-provider.interface";

@Module({
    imports: [ConfigModule, PrismaModule],
    controllers: [FraudController],
    providers: [fraudProviderFactory, FraudService],
    exports: [FraudService, FRAUD_PROVIDER_TOKEN],
})
export class FraudModule implements OnModuleInit {
    private readonly logger = new Logger(FraudModule.name);

    constructor(@Inject(FRAUD_PROVIDER_TOKEN) private readonly provider: FraudProvider) {}

    onModuleInit() {
        this.logger.log(`Fraud provider: ${this.provider.name}`);
        if (this.provider.name === FraudProviderName.OFF) {
            this.logger.log(
                "Account-fraud checks disabled (ABUSE_FRAUD_PROVIDER=off). Set sift|seon|castle when payout abuse warrants it.",
            );
        }
    }
}
