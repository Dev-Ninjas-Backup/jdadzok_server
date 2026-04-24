import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { Socket } from "socket.io";

@Injectable()
export class SocketLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(SocketLoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const client: Socket = context.switchToWs().getClient();
        // const data = context.switchToWs().getData();
        const pattern = context.getHandler().name;

        this.logger.log(`Socket Event: ${pattern} from ${client.id}`);

        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const duration = Date.now() - start;
                this.logger.log(`Socket Event: ${pattern} completed in ${duration}ms`);
            }),
            catchError((error) => {
                const duration = Date.now() - start;
                this.logger.error(
                    `Socket Event: ${pattern} failed after ${duration}ms - ${error.message}`,
                );
                throw error;
            }),
        );
    }
}
