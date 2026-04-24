import { Injectable } from "@nestjs/common";
import { AboutUsRepository } from "./about-us.repository";
import { UpdateAboutUsDto } from "./dto/about-us.dto";

@Injectable()
export class AboutUsService {
    constructor(private readonly aboutUsRepo: AboutUsRepository) {}

    async getAboutUs() {
        return this.aboutUsRepo.find();
    }

    async upsertAboutUs(input: UpdateAboutUsDto) {
        return this.aboutUsRepo.update(input);
    }
}
