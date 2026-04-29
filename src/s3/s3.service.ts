import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { join, extname } from "node:path";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class S3Service {
    private readonly uploadDir: string;
    private readonly baseUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.uploadDir = this.configService.get<string>("UPLOAD_DIR") || "uploads";
        this.baseUrl = this.configService.getOrThrow<string>("BASE_URL");
    }

    async uploadFiles(files: Express.Multer.File[]) {
        if (!files || files.length === 0) {
            throw new BadRequestException("No file(s) uploaded");
        }

        if (files.length > 20) {
            throw new BadRequestException("You can upload a maximum of 20 files");
        }

        const results = [];

        for (const file of files) {
            results.push(await this.uploadFile(file));
        }

        return results;
    }

    async uploadFile(file: Express.Multer.File) {
        if (!file?.buffer) {
            throw new BadRequestException("Invalid file");
        }

        const folder = this.getFolderByMimeType(file.mimetype);
        const folderPath = join(process.cwd(), this.uploadDir, folder);

        await fs.mkdir(folderPath, { recursive: true });

        const fileExt =
            extname(file.originalname).toLowerCase() || this.getExtByMimeType(file.mimetype);
        const hash = createHash("sha256").update(file.buffer).digest("hex");

        const fileName = `${hash}-${uuidv4()}${fileExt}`;
        const filePath = join(folderPath, fileName);

        try {
            await fs.writeFile(filePath, file.buffer);

            const url = `${this.baseUrl}/${this.uploadDir}/${folder}/${fileName}`;

            return {
                originalName: file.originalname,
                type: file.mimetype,
                size: file.size,
                url,
            };
        } catch (error) {
            console.error(error);
            throw new BadRequestException("Failed to upload file");
        }
    }

    private getFolderByMimeType(mimeType: string): string {
        if (mimeType.startsWith("image/")) return "images";
        if (mimeType.startsWith("audio/")) return "audio";
        if (mimeType.startsWith("video/")) return "videos";
        return "documents";
    }

    private getExtByMimeType(mimeType: string): string {
        if (mimeType === "image/jpeg") return ".jpg";
        if (mimeType === "image/png") return ".png";
        if (mimeType === "image/webp") return ".webp";

        if (mimeType === "video/mp4") return ".mp4";
        if (mimeType === "video/webm") return ".webm";
        if (mimeType === "video/quicktime") return ".mov";

        if (mimeType === "audio/mpeg") return ".mp3";
        if (mimeType === "application/pdf") return ".pdf";

        return "";
    }
}
