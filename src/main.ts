import { extendZodWithOpenApi } from "@anatine/zod-openapi";
import appMetadata from "@metadata/app-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import "reflect-metadata";
import z from "zod";
import { AppModule } from "./app.module";
import { ENVEnum } from "./common/enum/env.enum";
import { AllExceptionsFilter } from "./common/filter/http-exception.filter";

expand(config({ path: path.resolve(process.cwd(), ".env") }));
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // use raw body for only /payments/webhook (or bookings/webhook etc.)
    app.use("/stripe/webhook", bodyParser.raw({ type: "application/json" }));

    // CORS configuration
    app.enableCors({
        origin: [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:3003",
            "http://localhost:3004",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "https://jdadzok-admin-dashboard.netlify.app",
            "http://13.204.75.28",
        ],
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
            // forbidNonWhitelisted: true,
        }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());
    // app.useGlobalFilters(new GlobalExceptionFilter());

    // ✅ Swagger config with Bearer Auth
    extendZodWithOpenApi(z);
    const config = new DocumentBuilder()
        .setTitle(appMetadata.displayName)
        .setDescription(appMetadata.description)
        .setVersion(appMetadata.version)
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });

    const port = parseInt(configService.get<string>(ENVEnum.PORT) ?? "5056", 10);

    await app.listen(port, "0.0.0.0");
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📄 Swagger docs at http://localhost:${port}/docs`);
}

void bootstrap();
