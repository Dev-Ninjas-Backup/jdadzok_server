import { CapLevel } from "@constants/enums";
import { SetMetadata } from "@nestjs/common";
export const CAP_LEVEL_KEY = "capLevel";

export const CapLevels = <CL extends CapLevel>(...levels: CL[]) =>
    SetMetadata(CAP_LEVEL_KEY, levels);
