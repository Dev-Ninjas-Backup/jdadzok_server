import { Injectable } from "@nestjs/common";
import { HelperTx } from "@type/index";
import { CreateGifDto } from "./dto/create.gif.dto";

@Injectable()
export class GifRepository {
    constructor() {}

    async txStore(tx: HelperTx, data: CreateGifDto) {
        const gif = await tx.gif.findFirst({
            where: { url: data.url },
            select: { url: true, id: true },
        });
        if (!gif) return await tx.gif.create({ data, select: { url: true, id: true } });
        return gif;
    }
}
