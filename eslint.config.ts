// eslint.config.ts
import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
    globalIgnores([
        "dist/**",
        "build/**",
        "**/*.js",

        // config + prisma files typed project এ নাই
        "eslint.config.ts",
        "prisma.config.ts",
        "prisma/**",
    ]),

    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    {
        files: ["**/*.ts", "**/*.tsx"],
        ignores: ["eslint.config.ts", "prisma.config.ts", "prisma/**"],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: import.meta.dirname,
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "warn",

            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-call": "off",

            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/prefer-nullish-coalescing": "off",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/prefer-optional-chain": "off",
            "@typescript-eslint/restrict-template-expressions": "off",

            "no-useless-escape": "off",
            "no-redeclare": "off",
            "no-useless-catch": "off",
        },
    },
]);
