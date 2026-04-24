export const handleRequest = async <T>(action: () => Promise<T>, successMessage: string) => {
    try {
        const data = await action();
        return {
            success: true,
            message: successMessage,
            data,
        };
    } catch (error) {
        console.error(error);
        return {
            success: false,
            message: "Something went wrong",
            error: error.message || error,
        };
    }
};
