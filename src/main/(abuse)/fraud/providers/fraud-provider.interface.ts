import { FraudProviderName } from "../fraud.constants";
import { FraudScoreRequest, FraudVendorScore } from "../fraud.types";

export interface FraudProvider {
    readonly name: FraudProviderName;

    /** Score an account / payout event via the vendor (or stand-in). */
    score(request: FraudScoreRequest): Promise<FraudVendorScore>;
}
