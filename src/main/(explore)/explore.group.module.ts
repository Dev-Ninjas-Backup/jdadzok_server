import { Module } from "@nestjs/common";
import { CommunityModule } from "./communities/communities.module";

import { NgoModule } from "./ngo/ngo.module";
import { ExploreModule } from "./explore/explore.module";

@Module({
    imports: [CommunityModule, NgoModule, ExploreModule],
    controllers: [],
    providers: [],
    exports: [],
})
export class ExploreGroupModule {}
