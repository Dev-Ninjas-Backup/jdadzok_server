import { PrismaService } from "@lib/prisma/prisma.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { InjectQueue } from "@nestjs/bullmq";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { S3Service } from "@s3/s3.service";
import { Queue } from "bullmq";
import { CreateNgoVerificationDto } from "./dto/verification.dto";

@Injectable()
export class NgoVerificationService {
    constructor(
        @InjectQueue(QUEUE_JOB_NAME.VERIFICATION.NGO_VERIFICATION_PROCESSOR)
        private readonly verificationQueue: Queue,
        private readonly prisma: PrismaService,
        private readonly s3Service: S3Service,
    ) {}

    // NGO applies for verification
    async applyVerification(
        userId: string,
        ngoId: string,
        dto: CreateNgoVerificationDto,
        documents: Express.Multer.File[],
    ) {
        // -----------------------------------------------------
        //  NGO ownership & authorization
        // -----------------------------------------------------
        const ngo = await this.prisma.ngo.findUnique({
            where: { id: ngoId },
            include: {
                owner: {
                    include: { profile: true },
                },
            },
        });

        if (!ngo) {
            throw new NotFoundException("NGO not found");
        }

        if (ngo.ownerId !== userId) {
            throw new ForbiddenException("You are not authorized for this NGO");
        }

        if (!ngo.owner.stripeAccountId) {
            throw new BadRequestException(
                "NGO owner is not ready to receive payments. please add stripe account.",
            );
        }

        const profile = ngo.owner?.profile;
        if (!profile) {
            throw new BadRequestException(
                "Owner profile not found. Please complete your profile before applying for verification.",
            );
        }

        // -----------------------------------------------------
        //    Profile validation
        // -----------------------------------------------------
        const name = profile.name?.trim();
        const dob = profile.dateOfBirth;
        const gender = profile.gender;

        if (!name) {
            throw new BadRequestException(
                "Owner profile missing name – please update your profile name before applying for verification.",
            );
        }

        if (!dob) {
            throw new BadRequestException(
                "Owner profile missing date of birth – please update your profile date of birth before applying for verification.",
            );
        }

        if (!gender) {
            throw new BadRequestException(
                "Owner profile missing gender – please update your profile gender before applying for verification.",
            );
        }

        // -----------------------------------------------------
        //   Prevent duplicate verification
        // -----------------------------------------------------
        const existing = await this.prisma.ngoVerification.findFirst({
            where: {
                ngoId,
                status: { in: ["PENDING", "APPROVED"] },
            },
        });

        if (existing) {
            throw new BadRequestException(
                "A verification request already exists or has been approved.",
            );
        }

        // -----------------------------------------------------
        //   Validate & upload documents
        // -----------------------------------------------------
        if (!documents || documents.length === 0) {
            throw new BadRequestException("At least one verification document is required.");
        }

        const uploadedDocs = await this.s3Service.uploadFiles(documents);

        if (!uploadedDocs || uploadedDocs.length === 0) {
            throw new BadRequestException("Document upload failed. Please try again.");
        }

        // -----------------------------------------------------
        // 5. Save verification request
        // -----------------------------------------------------
        const verification = await this.prisma.ngoVerification.create({
            data: {
                ngoId,
                ...dto,
                documents: uploadedDocs,
            },
        });

        // -----------------------------------------------------
        // --Add to queue for async verification processing
        // -----------------------------------------------------
        await this.verificationQueue.add(QUEUE_JOB_NAME.VERIFICATION.NGO_VERIFICATION, {
            verificationId: verification.id,
            documentUrls: uploadedDocs,
            verificationType: dto.verificationType,
        });
        return verification;
    }

    async getVerificationStatus(ngoId: string) {
        const verification = await this.prisma.ngoVerification.findFirst({
            where: { ngoId },
            orderBy: { createdAt: "desc" },
        });
        if (!verification) throw new NotFoundException("No verification record found");

        return verification;
    }

    async getVerifications() {
        const verification = await this.prisma.ngoVerification.findMany({});
        if (!verification) throw new NotFoundException("No verification record found");

        return verification;
    }
}
