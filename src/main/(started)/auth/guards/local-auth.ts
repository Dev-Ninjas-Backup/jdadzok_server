import { IS_LOCAL_KEY } from "@common/jwt/jwt.decorator";
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class LocalAuthGuard extends AuthGuard(IS_LOCAL_KEY) {}
