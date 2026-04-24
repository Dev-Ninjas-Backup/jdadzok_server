import { AuthValidatorService } from "@global/auth-validator/auth-validator.service";
import { Injectable, Logger } from "@nestjs/common";
import chalk from "chalk";
import { Socket } from "socket.io";
import { SocketUtils } from "../utils/socket.utils";

@Injectable()
export class SocketMiddleware {
    private readonly logger = new Logger(SocketMiddleware.name);

    constructor(private readonly authValidator: AuthValidatorService) {}

    authenticate() {
        return async (socket: Socket, next: (err?: any) => void) => {
            try {
                const user = await this.authValidator.validateSocketToken(socket);
                socket.data.user = user;
                socket.join(user.id);

                this.logger.log(
                    `✅ Socket (${chalk.yellow(socket.id)}) authenticated as user (${chalk.yellow(user.profile?.username ?? user.email)})`,
                );
                next();
            } catch (error) {
                this.logger.error(`❌ Auth failed for socket ${socket.id}: ${error.message}`);
                next(new Error("Socket authentication failed"));
            }
        };
    }

    logging() {
        return (socket: Socket, next: (err?: any) => void) => {
            const ip = SocketUtils.getClientIP(socket) || socket.handshake.address || "unknown";
            const ua =
                SocketUtils.getUserAgent(socket) ||
                socket.handshake.headers["user-agent"] ||
                "unknown";

            this.logger.verbose(`📡 New connection ${socket.id} from IP ${ip}`);
            this.logger.verbose(`🧭 User-Agent: ${ua}`);

            socket.on("disconnect", (reason) => {
                this.logger.verbose(`🔌 Disconnected: ${socket.id}, Reason: ${reason}`);
            });

            next();
        };
    }
}
