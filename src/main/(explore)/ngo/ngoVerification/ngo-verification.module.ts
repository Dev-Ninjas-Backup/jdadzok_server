import { PrismaService } from "@lib/prisma/prisma.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { S3BucketModule } from "@s3/s3.module";
import { S3Service } from "@s3/s3.service";
import { NgoVerificationController } from "./ngo-verification.controller";
import { NgoVerificationService } from "./ngo-verification.service";
import { NgoVerificationProcessor } from "./ngo.processor";

@Module({
    imports: [
        BullModule.registerQueue({ name: QUEUE_JOB_NAME.VERIFICATION.NGO_VERIFICATION_PROCESSOR }),
        S3BucketModule,
    ],
    controllers: [NgoVerificationController],
    providers: [NgoVerificationProcessor, PrismaService, S3Service, NgoVerificationService],
    exports: [NgoVerificationService],
})
export class NgoVerificationModule {}
