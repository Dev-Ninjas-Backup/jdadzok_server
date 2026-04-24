import { BaseSocketGateway } from "@module/(sockets)/base/abstract-socket.gateway";
import { WebSocketGateway } from "@nestjs/websockets";

@WebSocketGateway({
    namespace: "posts/like",
})
export class LikeGetway extends BaseSocketGateway {
    // constructor(
    //     private readonly likeService: LikeService,
    //     private readonly sockMiddleare: SocketMiddleware,
    // ) {
    // }
    // @SubscribeMessage(SOCKET_LIKE_EVENT.LIKE)
    // async handleLike(@GetSocketUser() user: SocketUser, @MessageBody() body: CreateLikeDto) {
    //     if (!body.postId) throw new BadGatewayException("PostID is required to like a post!");
    //     try {
    //         const like = await this.likeService.likePost(user.id, body);
    //         console.info("postlike: ", like);
    //         // send notificaiton the the owner of the post && if owner not in online then send a mail to the user
    //         // and broadcast the event for the all tagged user
    //     } catch (err) {
    //         return err;
    //     }
    // }
    // @SubscribeMessage(SOCKET_LIKE_EVENT.DISLIKE)
    // async handleDislike(@GetSocketUser() user: SocketUser, @MessageBody() body: UpdateLikeDto) {
    //     if (!body.postId) throw new BadGatewayException("PostID is required to like a post!");
    //     try {
    //         const disLike = await this.likeService.likePost(user.id, {
    //             postId: body.postId!,
    //             userId: user.id,
    //         });
    //         console.info("postdisLike: ", disLike);
    //         // send notificaiton the the owner of the post && if owner not in online then send a mail to the user
    //         // and broadcast the event for the all tagged user
    //     } catch (err) {
    //         return err;
    //     }
    // }
}
