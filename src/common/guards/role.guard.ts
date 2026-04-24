import { ROLES_KEY } from "@common/decorators/roles.decorator";
import { Role } from "@constants/enums";
import { createBaseGuard } from "./base.guard";

export const RoleGuard = createBaseGuard<Role>(ROLES_KEY);
