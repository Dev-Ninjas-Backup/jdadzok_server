import appMetadata from "@metadata/app-metadata";
import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

@ApiTags("App")
@Controller()
export class AppController {
    @ApiOkResponse({
        description: "Returns service health status",
        example: "hello",
    })
    @Get()
    async getHealth() {
        return {
            status: "ok",
            version: appMetadata.version,
            name: appMetadata.displayName,
            description: appMetadata.description,
            timestamp: new Date().toISOString(),
        };
    }

    @ApiOkResponse({
        description: "Returns service health status for monitoring",
        schema: {
            example: {
                status: "healthy",
                timestamp: "2025-05-27T12:00:00.000Z",
                version: "0.3.1",
                uptime: 3600,
            },
        },
    })
    @Get("api/health")
    async getHealthCheck(@Res() res: Response) {
        res.status(200).json({
            status: "ok",
            name: appMetadata.displayName,
            version: appMetadata.version,
            description: appMetadata.description,
            environment: process.env.NODE_ENV,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            // memory: process.memoryUsage(),
            // cpu: process.cpuUsage(),
            team: {
                name: "Dev Ninja",
                leader: "Niloy",
                members: [
                    {
                        name: "Milon",
                        role: "Backend Developer",
                    },
                    {
                        name: "Sujon",
                        role: "Backend Developer",
                    },
                ],
            },
        });
    }
}
