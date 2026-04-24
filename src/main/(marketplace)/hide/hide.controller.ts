import { handleRequest } from "@common/utils/handle.request.util";
import { Controller, Param, Patch } from "@nestjs/common";
import { HideService } from "./hide.service";

@Controller("hide")
export class HideController {
    constructor(private readonly service: HideService) {}

    //  Toggle product visibility..
    @Patch(":productId/toggle")
    async toggle(@Param("productId") productId: string) {
        return handleRequest(() => this.service.toggleVisibility(productId), "");
    }
}
