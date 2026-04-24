import { AuthValidatorService } from "@global/auth-validator/auth-validator.service";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Socket } from "socket.io";
import { SocketUser } from "../@types";

@Injectable()
export class SocketAuthGuard implements CanActivate {
    constructor(private readonly authValidator: AuthValidatorService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== "ws") return true;

        const client: Socket = context.switchToWs().getClient();
        const user = await this.authValidator.validateSocketToken(client);

        const socketUser: SocketUser = {
            id: user.id,
            role: user.role,
            socketId: client.id,
            joinedAt: new Date(),
            status: "away",
            email: user.email,
        };

        client.data.user = socketUser;
        client.user = socketUser;

        return true;
    }
}
