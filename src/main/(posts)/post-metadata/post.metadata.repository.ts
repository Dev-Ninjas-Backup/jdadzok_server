import { Injectable } from "@nestjs/common";
import { HelperTx } from "@type/index";
import { CreatePostMetadataDto, UpdatePostMetadataDto } from "./dto/post.metadata.dto";

@Injectable()
export class PostMetadataRepository {
    async txStore(tx: HelperTx, data: CreatePostMetadataDto) {
        return await tx.postMetadata.create({
            data: {
                checkInId: data.checkInId,
                gifId: data.gifId,
                feelings: data.feelings,
            },
        });
    }
    async txUpdate(tx: HelperTx, metadataId: string, meta: UpdatePostMetadataDto) {
        const { ...input } = meta;
        return await tx.postMetadata.update({
            where: { id: metadataId },
            data: {
                checkInId: input.checkInId!,
                gifId: input.gifId!,
                feelings: input.feelings ?? "HAPPY",
            },
            include: { checkIn: true, gif: true },
        });
    }
}
