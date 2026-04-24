import { Global, Module } from "@nestjs/common";
import { FileService } from "./services/file.service";
import { SuperAdminService } from "./services/super-admin.service";
import { CapRequirementsSeedService } from "./services/cap-requirements.seed.service";

@Global()
@Module({
    imports: [],
    providers: [FileService, SuperAdminService, CapRequirementsSeedService],
    exports: [FileService, SuperAdminService, CapRequirementsSeedService],
})
export class SeedModule {}
