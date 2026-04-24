import { Module } from "@nestjs/common";
import { AboutUsController } from "./about-us.controller";
import { AboutUsRepository } from "./about-us.repository";
import { AboutUsService } from "./about-us.service";

@Module({
    controllers: [AboutUsController],
    providers: [AboutUsRepository, AboutUsService],
})
export class AboutUsModule {}
