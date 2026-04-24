declare module "idanalyzer2" {
    export class Profile {
        static SECURITY_LOW: number;
        static SECURITY_MEDIUM: number;
        static SECURITY_HIGH: number;
        constructor(level?: number);
    }

    export class Scanner {
        constructor(apiKey: string);
        setProfile(profile: Profile): void;
        quickScan(file: string, options?: any): Promise<any>;
        scan(file: string, options?: any): Promise<any>;
        throwApiException(flag: boolean): void;
    }

    export class APIError extends Error {
        code: string;
        msg: string;
    }

    export class InvalidArgumentException extends Error {}
}
