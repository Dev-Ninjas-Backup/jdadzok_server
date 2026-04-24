import { errorResponse } from "@common/utils/response.util";
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let message: string | string[];
        let errorData: unknown = null;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();

            if (typeof res === "string") {
                message = res;
            } else if (typeof res === "object" && res !== null && "message" in res) {
                const msg = (res as any).message;
                // Support message as string or array
                message = Array.isArray(msg) ? msg : String(msg);
                errorData = res;
            } else {
                message = "An error occurred";
            }
        } else if (exception instanceof Error) {
            //----------------- native JS errors----------------------
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = exception.message || "Internal server error";
            errorData = {
                name: exception.name,
                stack: exception.stack,
            };
        } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = "Internal server error";
        }

        //--------------------- Return standardized error payload------------------------
        const errorPayload = errorResponse(errorData, message as any);
        console.error("===============================");
        console.error("Request URL:", request.url);
        console.error("HTTP Status:", status);
        console.error("Error Message:", message);
        console.error("Error Details:", exception);
        console.error("===============================");
        response.status(status).json(errorPayload);
    }
}

// import {
//   ArgumentsHost,
//   Catch,
//   ExceptionFilter,
//   HttpException,
//   HttpStatus,
//   Logger,
// } from '@nestjs/common';
// import { Request, Response } from 'express';

// @Catch()
// export class GlobalExceptionFilter implements ExceptionFilter {
//   private logger = Logger.log(GlobalExceptionFilter.name);
//   catch(exception: unknown, host: ArgumentsHost) {
//     console.log(exception);

//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();
//     const status =
//       exception instanceof HttpException
//         ? exception.getStatus()
//         : HttpStatus.INTERNAL_SERVER_ERROR;

//     const message =
//       exception instanceof HttpException
//         ? exception.getResponse()
//         : 'Internal server error';

//     response.status(status).json({
//       statusCode: status,
//       success: false,
//       message:
//         typeof message === 'string'
//           ? message
//           : (message as any).message || message,
//       path: request.url,
//     });
//   }
// }
