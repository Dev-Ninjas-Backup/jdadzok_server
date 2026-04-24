import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { RedisService } from "@module/(sockets)/services/redis.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { generateRedisKey } from "@utils/index";
import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { S3ResponseDto } from "./dto/s3.dto";

@Injectable()
export class S3Service {
    private s3: S3Client;
    private AWS_S3_BUCKET_NAME: string;
    private AWS_REGION: string;

    constructor(
        private readonly configSerivce: ConfigService,
        private readonly redisService: RedisService,
    ) {
        this.AWS_REGION = this.configSerivce.getOrThrow("AWS_REGION");
        this.AWS_S3_BUCKET_NAME = this.configSerivce.getOrThrow("AWS_S3_BUCKET_NAME");

        this.s3 = new S3Client({
            region: this.AWS_REGION,
            credentials: {
                accessKeyId: this.configSerivce.getOrThrow("AWS_ACCESS_KEY_ID"),
                secretAccessKey: this.configSerivce.getOrThrow("AWS_SECRET_ACCESS_KEY"),
            },
        });
    }

    async getFile() {}

    async uploadFiles<T extends string>(files: Express.Multer.File[]): Promise<T[]> {
        if (!files || files.length === 0) {
            throw new BadRequestException("No file(s) uploaded");
        }

        if (files.length > 20) {
            throw new BadRequestException("You can upload a maximum of 20 files");
        }

        const results: string[] = [];

        for (const file of files) {
            results.push(await this.uploadFile(file));
        }

        return results as T[];
    }

    async uploadFile<T extends string>(file: Express.Multer.File): Promise<T> {
        const isSmallFile = file.size < 20 * 1024 * 1024; // 20MB
        let fileHash: string | null = null;

        if (isSmallFile) {
            // Generate file hash
            fileHash = createHash("sha256").update(file.buffer).digest("hex");

            const key = generateRedisKey("S3FileHash", fileHash);
            // Check Redis for existing URL
            const cached = await this.redisService.get<S3ResponseDto>(key);

            if (cached) return cached.url as T; // Skip upload
        }

        // Build S3 Key
        const fileExt = file.originalname.split(".").pop();
        const folder = this.getFolderByMimeType(file.mimetype);
        const uniqueFileName = `${fileHash ?? uuidv4()}.${fileExt}`;
        const s3Key = `${folder}/${uniqueFileName}`;

        try {
            // Upload
            const command = new PutObjectCommand({
                Bucket: this.AWS_S3_BUCKET_NAME,
                Key: s3Key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await this.s3.send(command);

            const result: S3ResponseDto = {
                size: file.size,
                type: file.mimetype,
                originalName: file.originalname,
                url: `https://${this.AWS_S3_BUCKET_NAME}.s3.${this.AWS_REGION}.amazonaws.com/${s3Key}`,
            };

            // Store in Redis if small file
            if (isSmallFile && fileHash) {
                const key = generateRedisKey("S3FileHash", fileHash);
                await this.redisService.set(key, result, "1d");
            }

            // return result;
            return `https://${this.AWS_S3_BUCKET_NAME}.s3.${this.AWS_REGION}.amazonaws.com/${s3Key}` as T;
        } catch (err) {
            console.info(err);
            throw new BadRequestException("Failed to upload file to S3");
        }
    }

    private getFolderByMimeType(mimeType: string): string {
        if (mimeType.startsWith("image/")) return "images";
        if (mimeType.startsWith("audio/")) return "audio";
        if (mimeType.startsWith("video/")) return "videos";
        return "documents";
    }
}
