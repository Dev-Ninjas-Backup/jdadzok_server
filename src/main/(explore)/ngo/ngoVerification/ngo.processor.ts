// src/verification/ngo-verification.processor.ts
import { IdentityVerificationType } from "@constants/enums";
import { PrismaService } from "@lib/prisma/prisma.service";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { InternalServerErrorException, Logger } from "@nestjs/common";
import IdAnalyzer from "idanalyzer2";

const { Profile, Scanner, APIError, InvalidArgumentException } = IdAnalyzer;

@Processor(QUEUE_JOB_NAME.VERIFICATION.NGO_VERIFICATION_PROCESSOR)
export class NgoVerificationProcessor extends WorkerHost {
    private readonly logger = new Logger(NgoVerificationProcessor.name);

    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async process(job: any): Promise<any> {
        if (job.name !== QUEUE_JOB_NAME.VERIFICATION.NGO_VERIFICATION) return;

        const {
            verificationId,
            documentUrls,
            verificationType,
        }: {
            verificationId: string;
            documentUrls: string[];
            verificationType: IdentityVerificationType;
        } = job.data;

        console.info(`Processing NGO verification for ID: ${verificationId}`);

        const scanResults: any[] = [];
        let status = "APPROVED";
        let errorReason = "";

        try {
            // -------------------------------------------------
            // 0. API key
            // -------------------------------------------------
            const apiKey = process.env.IDANALYZER_API_KEY;
            if (!apiKey) throw new Error("Missing IDAnalyzer API key");

            const scanner = new Scanner(apiKey);
            scanner.throwApiException(true);
            scanner.setProfile(new Profile(Profile.SECURITY_MEDIUM));

            // -------------------------------------------------
            // 1. Pull owner → Profile (name, dateOfBirth, gender)
            // -------------------------------------------------
            const verification = await this.prisma.ngoVerification.findUnique({
                where: { id: verificationId },
                include: {
                    ngo: {
                        include: {
                            owner: {
                                include: {
                                    profile: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!verification) throw new Error("Verification record not found");

            const ownerProfile = verification.ngo.owner.profile;
            if (!ownerProfile) {
                throw new Error("Owner profile not found – cannot verify identity");
            }

            const expectedName = ownerProfile.name?.trim().toUpperCase();
            const expectedDob = ownerProfile.dateOfBirth
                ? this.formatDate(ownerProfile.dateOfBirth)
                : null;
            const expectedGender = ownerProfile.gender;

            if (!expectedName) {
                throw new Error("Owner profile missing name – profile.name is null or empty");
            }

            if (!expectedDob) {
                throw new Error(
                    "Owner profile missing date of birth – profile.dateOfBirth is null",
                );
            }

            if (!expectedGender) {
                throw new Error("Owner profile missing gender – profile.gender is null");
            }

            // console.log(
            //     `Owner Check → Name: "${expectedName}" | DOB: "${expectedDob}" | Gender: "${expectedGender}"`,
            // );

            // -------------------------------------------------
            // 2. Scan every document
            // -------------------------------------------------
            const scannedNames: string[] = [];
            const scannedDobs: string[] = [];
            const scannedGenders: string[] = [];

            for (let i = 0; i < documentUrls.length; i++) {
                const url = documentUrls[i];
                this.logger.log(`Scanning doc ${i + 1}/${documentUrls.length}: ${url}`);

                const scanResult = await scanner.quickScan(url);
                scanResults.push(scanResult);

                // ---- Authenticate ----
                const decision = scanResult?.decision?.toLowerCase();
                if (decision !== "accept") {
                    status = "PENDING";
                    errorReason = `Doc ${i + 1} failed authentication (decision: ${decision})`;
                    this.logger.warn(errorReason);
                    break;
                }

                // const daysToExpiry = parseInt(scanResult?.data?.daysToExpiry?.[0]?.value ?? "0", 10);
                // if (daysToExpiry < 0) {
                //     status = "REJECTED";
                //     errorReason = `Doc ${i + 1} is expired (${daysToExpiry} days)`;
                //     this.logger.warn(errorReason);
                //     break;
                // }

                // ---- Extract name, DOB, gender ----
                const fullName = scanResult?.data?.fullName?.[0]?.value?.trim().toUpperCase();
                const dob = scanResult?.data?.dob?.[0]?.value;
                const gender = scanResult?.data?.gender?.[0]?.value?.toUpperCase();

                if (!fullName || !dob || !gender) {
                    status = "PENDING";
                    errorReason = `Doc ${i + 1} missing required fields: name=${!!fullName}, dob=${!!dob}, gender=${!!gender}`;
                    this.logger.warn(errorReason);
                    break;
                }

                scannedNames.push(fullName);
                scannedDobs.push(dob);
                scannedGenders.push(gender);

                // console.log(`Scanned → Name: "${fullName}" | DOB: "${dob}" | Gender: "${gender}"`);
            }

            if (status === "PENDING") throw new Error(errorReason);

            // -------------------------------------------------
            // 3. Compare name, DOB, gender
            // -------------------------------------------------
            const nameMatches = scannedNames.every((n) => n === expectedName);
            const dobMatches = scannedDobs.every((d) => d === expectedDob);
            const genderMatches = scannedGenders.every((g) => g === expectedGender);

            if (!nameMatches || !dobMatches || !genderMatches) {
                status = "PENDING";
                errorReason = [
                    !nameMatches
                        ? `Name mismatch: DB="${expectedName}", Scanned="${scannedNames[0]}"`
                        : "",
                    !dobMatches
                        ? `DOB mismatch: DB="${expectedDob}", Scanned="${scannedDobs[0]}"`
                        : "",
                    !genderMatches
                        ? `Gender mismatch: DB="${expectedGender}", Scanned="${scannedGenders[0]}"`
                        : "",
                ]
                    .filter(Boolean)
                    .join(" | ");
                this.logger.warn(errorReason);
                throw new Error(errorReason);
            }

            // -------------------------------------------------
            // 4. Multi-doc consistency
            // -------------------------------------------------
            if (documentUrls.length > 1) {
                const uniqNames = new Set(scannedNames);
                const uniqDobs = new Set(scannedDobs);
                const uniqGenders = new Set(scannedGenders);

                if (uniqNames.size > 1 || uniqDobs.size > 1 || uniqGenders.size > 1) {
                    status = "PENDING";
                    errorReason = "Inconsistent name, DOB, or gender across documents";
                    this.logger.warn(errorReason);
                    throw new Error(errorReason);
                }
            }

            // -------------------------------------------------
            // SUCCESS → persist
            // -------------------------------------------------
            const verificationResponseObject = {
                scans: scanResults,
                identityCheck: {
                    expected: {
                        name: expectedName,
                        dob: expectedDob,
                        gender: expectedGender,
                    },
                    scanned: {
                        names: scannedNames,
                        dobs: scannedDobs,
                        genders: scannedGenders,
                    },
                },
            };
            await this.prisma.ngoVerification.update({
                where: { id: verificationId },
                data: {
                    status: "APPROVED",
                    verificationType: verificationType,
                    verificationResponse: verificationResponseObject,
                },
            });

            console.info(
                `User verification complete: ${verificationId} (APPROVED)`,
                "\nScanner Results:",
                JSON.stringify(scanResults, null, 2),
            );

            return { status: "APPROVED", scanResults };
        } catch (e: any) {
            const errMsg =
                e instanceof InvalidArgumentException
                    ? e.message
                    : e instanceof APIError
                      ? `${e.code} - ${e.msg}`
                      : (e?.message ?? "Unknown error");

            await this.prisma.ngoVerification.update({
                where: { id: verificationId },
                data: {
                    status: "PENDING",
                    verificationResponse: {
                        scans: scanResults,
                        error: errMsg,
                        reason: errorReason || errMsg,
                    },
                    verificationType,
                },
            });

            throw new InternalServerErrorException(errMsg);
        }
    }

    private formatDate(date: Date): string {
        return date.toISOString().split("T")[0];
    }
}
