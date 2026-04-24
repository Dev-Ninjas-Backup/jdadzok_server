export interface SocketConfig {
    cors: {
        origin: string | string[];
        credentials: boolean;
    };
    transports: string[];
    pingTimeout: number;
    pingInterval: number;
    maxHttpBufferSize: number;
    allowEIO3: boolean;
}

export const getSocketConfig = (): SocketConfig => {
    const env = process.env.NODE_ENV || "development";

    const baseConfig: SocketConfig = {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
            credentials: true,
        },
        transports: ["websocket", "polling"],
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6, // 1MB
        allowEIO3: true,
    };

    switch (env) {
        case "production":
            return {
                ...baseConfig,
                cors: {
                    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["https://yourdomain.com"],
                    credentials: true,
                },
                transports: ["websocket"], // Only websocket in production
            };

        case "development":
        default:
            return baseConfig;
    }
};
