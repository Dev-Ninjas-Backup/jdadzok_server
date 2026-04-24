// import {
//   BadGatewayException,
//   Injectable,
//   UnauthorizedException,
// } from "@nestjs/common";
// import { SocketMiddleware } from "@module/(sockets)/middleware/socket.middleware";
// import { JwtServices } from "@service/jwt.service";
// import { Socket } from "socket.io";

// @Injectable()
// export class SocketAuthMiddleware {
//   constructor(private authService: JwtServices, private readonly socketMiddleware: SocketMiddleware) {}

//   async use(socket: Socket, next: (err?: any) => void) {
//     this.socketMiddleware.authenticate()()
// }
