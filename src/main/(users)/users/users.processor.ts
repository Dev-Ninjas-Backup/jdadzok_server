import { OtpRedisData } from "@lib/utils/otp.types";
import { QUEUE_JOB_NAME } from "@module/(buill-queue)/constants";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { InternalServerErrorException, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { UserService } from "./users.service";

@Processor("users")
export class UsersProcessor extends WorkerHost {
    private readonly logger = new Logger(UsersProcessor.name);
    constructor(private readonly service: UserService) {
        super();
    }
    async process<T = any>(job: Job): Promise<T | string | undefined> {
        switch (job.name) {
            case QUEUE_JOB_NAME.MAIL.SEND_OTP:
                try {
                    const otp = await this.service.sendOtpMail({
                        email: job.data.email,
                        userId: job.data.userId,
                    });
                    return otp as T;
                } catch (error: any) {
                    this.logger.error("Could not send opt", error);
                    throw new InternalServerErrorException("Could not send opt");
                }
            case QUEUE_JOB_NAME.MAIL.POST_MAIL:
                return new Promise((resolv) => resolv("Hello"));
        }
    }
}
