import { Injectable } from "@nestjs/common";
import { WebSocketGateway } from "@nestjs/websockets";
import { BaseSocketGateway } from "./abstract-socket.gateway";

@Injectable()
@WebSocketGateway()
export class RootGetway extends BaseSocketGateway {}
