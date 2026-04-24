import { Injectable } from "@nestjs/common";
import { UpdatePrivacyPolicyDto } from "./dto/privacy-policy.dto";
import { PrivacyPolicyRepository } from "./privacy-policy.repository";

@Injectable()
export class PrivacyPolicyService {
    constructor(private readonly privacyPolicyRepo: PrivacyPolicyRepository) {}

    async getPrivacyPolicy() {
        return this.privacyPolicyRepo.find();
    }

    async upsertPrivacyPolicy(input: UpdatePrivacyPolicyDto) {
        return this.privacyPolicyRepo.update(input);
    }
}
