import { BaseSocketGateway } from "@module/(sockets)/base/abstract-socket.gateway";
import { Injectable } from "@nestjs/common";
import { OnGatewayInit, WebSocketGateway } from "@nestjs/websockets";

@WebSocketGateway({
    namespace: "/posts",
})
@Injectable()
export class PostGateway extends BaseSocketGateway implements OnGatewayInit {
    // constructor(
    //     private readonly postService: PostService,
    //     private readonly socket: SocketMiddleware,
    // ) {
    // }
    // afterInit() {
    //     this.server.use(this.socket.authenticate());
    //     // this.server.use(this.socketMiddleware.rateLimit(1000, 10));
    //     // this.server.use(this.socketMiddleware.logging());
    // }
    // @SubscribeMessage(SOCKET_EVENTS.POST.CREATE)
    // async handlePostCreate(
    //     @GetSocketUser() user: SocketUser,
    //     @ConnectedSocket() client: Socket,
    //     @MessageBody() data: PostEvent,
    // ) {
    //     const parse = await safeParseAsync(CreatePostDto, data);
    //     if (!parse.success)
    //         throw new BadGatewayException("Fail to parse data please give valid input");
    //     const post = await this.postService.create({
    //         ...parse.data,
    //         authorId: user.id,
    //     });
    //     const postEvent: PostEvent = {
    //         eventId: SOCKET_EVENTS.POST.CREATE,
    //         timestamp: new Date(),
    //         userId: user.id,
    //         action: "create",
    //         content: {
    //             message: "Post Created successfully",
    //             post,
    //         },
    //     };
    //     // Broadcast new post to all users (who is the follower)
    //     this.broadcastToAll(SOCKET_EVENTS.POST.CREATE, postEvent, client.id);
    //     client.emit(SOCKET_EVENTS.POST.CREATE, this.createResponse(true, postEvent));
    //     this.logger.log(`Post created by user ${user.id}: HERE WILL BE POST ID`);
    //     this.logger.log(`Post created by`);
    // }
    // @SubscribeMessage(SOCKET_EVENTS.POST.LIKE)
    // async handlePostReaction(
    //     @ConnectedSocket() client: Socket,
    //     @MessageBody() data: Omit<PostReaction, "eventId" | "timestamp" | "userId">,
    // ) {
    //     const userId = this.getUserId(client.id);
    //     if (!userId) return;
    //     const reactionEvent: PostReaction = {
    //         ...data,
    //         eventId: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    //         timestamp: new Date(),
    //         userId,
    //     };
    //     const postRoomId = `post:${data.postId}`;
    //     // Emit to post room and the post creator
    //     this.emitToRoom(postRoomId, SOCKET_EVENTS.POST.LIKE, reactionEvent);
    //     client.emit(SOCKET_EVENTS.POST.LIKE, this.createResponse(true, reactionEvent));
    //     this.logger.log(`Post ${data.postId} ${data.action} by user ${userId}`);
    // }
    // @SubscribeMessage(SOCKET_EVENTS.POST.COMMENT_ADD)
    // async handlePostComment(
    //     @ConnectedSocket() client: Socket,
    //     @MessageBody() data: Omit<PostComment, "eventId" | "timestamp" | "userId">,
    //     @SocketUser() user:
    // ) {
    //     if (!userId) return;
    //     if (!data.content?.trim()) {
    //         client.emit(
    //             SOCKET_EVENTS.ERROR.VALIDATION,
    //             this.createResponse(false, null, "Comment cannot be empty"),
    //         );
    //         return;
    //     }
    //     const commentEvent: PostComment = {
    //         ...data,
    //         eventId: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    //         timestamp: new Date(),
    //         userId,
    //         action: "create",
    //     };
    //     const postRoomId = `post:${data.postId}`;
    //     // Join post room if not already in it
    //     await this.joinRoom(client, postRoomId, {
    //         name: `Post ${data.postId}`,
    //         type: "post",
    //     });
    //     this.emitToRoom(postRoomId, SOCKET_EVENTS.POST.COMMENT_ADD, commentEvent, client.id);
    //     client.emit(SOCKET_EVENTS.POST.COMMENT_ADD, this.createResponse(true, commentEvent));
    //     this.logger.log(`Comment added to post ${data.postId} by user ${userId}`);
    // }
}
