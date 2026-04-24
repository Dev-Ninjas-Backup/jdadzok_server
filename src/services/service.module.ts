import { SocketMiddleware } from "@module/(sockets)/middleware/socket.middleware";
import { Logger, Module } from "@nestjs/common";
import { SimpleBaseQueryDto } from "./dto/simple.base.query.dto";
import { JwtServices } from "./jwt.service";
import { ApplicationLogger } from "./logger.service";

@Module({
    providers: [
        JwtServices,
        SimpleBaseQueryDto,
        { provide: Logger, useClass: ApplicationLogger },
        SocketMiddleware,
    ],
    exports: [JwtServices, SimpleBaseQueryDto],
})
export class ServiceModule {}
