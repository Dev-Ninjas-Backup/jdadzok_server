import { Module } from "@nestjs/common";
import { LocationRepository } from "./locations.repository";

@Module({
    imports: [],
    providers: [LocationRepository],
    exports: [LocationRepository],
})
export class LocationModule {}
