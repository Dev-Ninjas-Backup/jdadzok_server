import { Injectable } from "@nestjs/common";
import { UpdateTermsAndConditionsDto } from "./dto/terms-and-conditions.dto";
import { TermsAndConditionsRepository } from "./terms-and-conditions.repository";

@Injectable()
export class TermsAndConditionsService {
    constructor(private readonly termsRepo: TermsAndConditionsRepository) {}

    async getTermsAndConditions() {
        return this.termsRepo.find();
    }

    async upsertTermsAndConditions(input: UpdateTermsAndConditionsDto) {
        return this.termsRepo.update(input);
    }
}
