import { Injectable } from "@nestjs/common";
import { FraudProviderName } from "../fraud.constants";
import { FraudScoreRequest, FraudVendorScore } from "../fraud.types";
import { FraudProvider } from "./fraud-provider.interface";

/** No-op when ABUSE_FRAUD_PROVIDER=off or misconfigured — always low risk. */
@Injectable()
export class OffFraudProvider implements FraudProvider {
    readonly name = FraudProviderName.OFF;

    async score(request: FraudScoreRequest): Promise<FraudVendorScore> {
        void request;
        return { score: 0, labels: ["provider_off"] };
    }
}
