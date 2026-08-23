import { MakePublic } from "@common/jwt/jwt.decorator";
import { SOFT_EARNINGS_CONTRACT } from "@common/constants/soft-earnings.contract";
import { successResponse } from "@common/utils/response.util";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("API contracts")
@Controller("contracts")
export class ContractsController {
    @Get("soft-earnings")
    @MakePublic()
    @ApiOperation({
        summary: "Soft-language Cap earnings API contract",
        description:
            "Documents which payloads omit hard revenue % and where exact figures are available (personal dashboard only).",
    })
    getSoftEarningsContract() {
        return successResponse(SOFT_EARNINGS_CONTRACT, "Soft earnings contract");
    }
}
