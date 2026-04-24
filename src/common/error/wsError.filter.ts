import { Catch, ArgumentsHost } from "@nestjs/common";
import { BaseWsExceptionFilter, WsException } from "@nestjs/websockets";

@Catch(WsException)
export class WebSocketExceptionsFilter extends BaseWsExceptionFilter {
    catch(exception: WsException, host: ArgumentsHost) {
        const client = host.switchToWs().getClient();
        const data = host.switchToWs().getData();
        const error = exception.getError();

        let errorMessage: string;

        // Handle different error types
        if (typeof error === "string") {
            errorMessage = error;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else if (error && typeof error === "object" && "message" in error) {
            errorMessage = error.message as string;
        } else {
            errorMessage = "Unknown error";
        }

        const errorResponse = {
            event: "error",
            data: {
                id: data?.id || undefined,
                message: errorMessage,
                status: "error",
            },
        };

        client.send(JSON.stringify(errorResponse));
    }
}
