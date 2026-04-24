export class ApiResponse {
    static success(message: string, data?: any) {
        return { status: "success", message, data };
    }

    static error(message: string, error?: any) {
        return { status: "error", message, error };
    }
}
