import { Module } from "@nestjs/common";
import { S3Controller } from "./s3.controller";
import { S3Service } from "./s3.service";
import { S3Repository } from "./s3.repository";

@Module({
    imports: [],
    controllers: [S3Controller],
    providers: [S3Repository, S3Service],
    exports: [S3Service],
})
export class S3BucketModule {}
