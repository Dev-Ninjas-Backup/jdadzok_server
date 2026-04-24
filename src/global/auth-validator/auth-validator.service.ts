import { UserRepository } from "@module/(users)/users/users.repository";
import { BadGatewayException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtServices } from "@service/jwt.service";
import { Socket } from "socket.io";

@Injectable()
export class AuthValidatorService {
    constructor(
        private readonly jwtService: JwtServices,
        private readonly userRepo: UserRepository,
    ) {}

    async validateSocketToken(socket: Socket) {
        const token = this.extractToken(socket);

        if (!token) {
            throw new BadGatewayException("Unauthorized user - Token not found");
        }

        const isVerifiedToken = await this.jwtService.verifyAsync(token);

        if (!isVerifiedToken?.sub || !isVerifiedToken?.email) {
            throw new BadGatewayException("Invalid or expired token");
        }

        const user = await this.userRepo.findById(isVerifiedToken.sub);

        if (!user) {
            throw new BadGatewayException("Unauthorized User ❌", {
                description: "User not found with that email & id",
            });
        }

        if (!user.isVerified) {
            throw new UnauthorizedException("Please verify your account first");
        }

        return user;
    }

    // -------------------------------------------------------
    // Token extractor supporting ALL methods (Bearer, cookie,
    // query, Socket.io auth, raw header)
    // -------------------------------------------------------
    private extractToken(client: Socket): string | null {
        // ---------------------------
        // 1. Authorization header
        // ---------------------------
        const authHeader = client.handshake.headers.authorization;
        if (authHeader) {
            // Case: "Bearer <token>"
            if (authHeader.startsWith("Bearer ")) {
                return authHeader.replace("Bearer ", "").trim();
            }
            // Case: "<token>"
            return authHeader.trim();
        }

        // ---------------------------
        // 2. socket.io auth: { token }
        // ---------------------------
        if (client.handshake.auth?.token) {
            return client.handshake.auth.token;
        }

        // ---------------------------
        // 3. Query param: ?token=abc
        // ---------------------------
        if (client.handshake.query?.token) {
            return client.handshake.query.token as string;
        }

        // ---------------------------
        // 4. Cookie: token=abc
        // ---------------------------
        const rawCookie = client.handshake.headers.cookie;
        if (rawCookie) {
            const cookies = rawCookie.split(";").reduce(
                (acc, c) => {
                    const [key, value] = c.trim().split("=");
                    acc[key] = value;
                    return acc;
                },
                {} as Record<string, string>,
            );

            if (cookies.token) return cookies.token;
        }

        return null;
    }
}
