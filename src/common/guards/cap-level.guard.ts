import { CapLevel } from "@constants/enums";
import { CAP_LEVEL_KEY } from "../decorators/cap-level.decorator";
import { createBaseGuard } from "./base.guard";

export const CapLevelGuard = createBaseGuard<CapLevel>(CAP_LEVEL_KEY);
