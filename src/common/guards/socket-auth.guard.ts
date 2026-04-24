import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Socket } from "socket.io";

@Injectable()
export class SocketAuthGuard implements CanActivate {
    constructor(private jwtService: JwtService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client = context.switchToWs().getClient<Socket>();
        const token =
            client.handshake.auth?.token || client.handshake.headers?.authorization?.split(" ")[1];

        if (!token) return false;

        try {
            const payload = await this.jwtService.verifyAsync(token);
            (client as any).user = payload;
            return true;
        } catch {
            return false;
        }
    }
}
