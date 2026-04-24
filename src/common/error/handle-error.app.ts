export class AppError extends Error {
    constructor(
        public code = 500,
        public message: string,
    ) {
        super(message);
        this.name = "AppError";
    }
}
