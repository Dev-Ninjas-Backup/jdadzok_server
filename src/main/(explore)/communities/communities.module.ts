import { Module } from "@nestjs/common";

import { CommunitiesController } from "./communities.controller";
import { CommunitiesService } from "./communities.service";
import { SearchModule } from "@module/(search)/search.module";

@Module({
    imports: [SearchModule],
    controllers: [CommunitiesController],
    providers: [CommunitiesService],
    exports: [],
})
export class CommunityModule {}
