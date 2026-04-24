export const apiBodyExample = {
    schema: {
        type: "object",
        properties: {
            files: {
                type: "array",
                items: {
                    type: "string",
                    format: "binary",
                },
                maxItems: 20,
            },
        },
    },
};
