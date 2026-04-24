import { Logger, LoggerService } from "@nestjs/common";

export class ApplicationLogger extends Logger implements LoggerService {
    log(message: string) {
        super.log(message);
        // Your custom logic here (e.g., saving logs to a file or an external service)
    }

    error(message: string, trace: string) {
        super.error(message, trace);
        // Your custom logic here
    }

    warn(message: string) {
        super.warn(message);
        // Your custom logic here
    }

    debug(message: string) {
        super.debug(message);
        // Your custom logic here
    }

    verbose(message: string) {
        super.verbose(message);
        // Your custom logic here
    }
}
