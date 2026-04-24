import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    Type,
    UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

export function createBaseGuard<T = any>(metadataKey: string): Type<CanActivate> {
    @Injectable()
    class BaseGuard implements CanActivate {
        constructor(private readonly reflector: Reflector) {}

        canActivate(context: ExecutionContext): boolean {
            const requiredValues = this.reflector.getAllAndOverride<T[]>(metadataKey, [
                context.getHandler(),
                context.getClass(),
            ]);

            if (!requiredValues || requiredValues.length === 0) return true; // No restriction

            const request = context.switchToHttp().getRequest();
            const user = request.user;

            if (!user) {
                throw new UnauthorizedException("Unauthorized: No user found in request.");
            }

            const userValue = user?.[metadataKey];

            if (!userValue) throw new ForbiddenException(`User has no ${metadataKey} value.`);

            const isAllowed = requiredValues.includes(userValue as T);
            if (!isAllowed)
                throw new ForbiddenException(
                    `Access denied. Required ${metadataKey}: [${requiredValues.join(", ")}]`,
                );

            return true;
        }
    }

    return BaseGuard;
}
