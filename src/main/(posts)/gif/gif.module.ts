import { Module } from "@nestjs/common";
import { GifRepository } from "./gif.repository";

@Module({
    imports: [],
    providers: [GifRepository],
    exports: [GifRepository],
})
export class GifModule {}
