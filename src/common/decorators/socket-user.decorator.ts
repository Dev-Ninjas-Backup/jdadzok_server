import { RateLimitConfig, SocketUser as TUser } from "@module/(sockets)/@types";
import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Socket } from "socket.io";

export const RATE_LIMIT_KEY = "socket_rate_limit";
export const SocketRateLimit = (config: RateLimitConfig) => SetMetadata(RATE_LIMIT_KEY, config);

export const GetSocketUser = createParamDecorator(
    (_: unknown, context: ExecutionContext): TUser => {
        const client: Socket = context.switchToWs().getClient();
        return client.data.user;
    },
);
