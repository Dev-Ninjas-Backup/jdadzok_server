import { ENVEnum } from "@common/enum/env.enum";
import appMetadata from "@metadata/app-metadata";
import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { MailContext, MailTemplateType } from "./mail-context.type";
import { generateFriendRequestEmail } from "./templates/friend-request.template";
import { generateOtpEmail } from "./templates/otp.template";

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private logger = new Logger(MailService.name);

    constructor(private configService: ConfigService) {
        this.transporter = nodemailer.createTransport(
            {
                service: "gmail",

                auth: {
                    user: this.configService.getOrThrow<string>(ENVEnum.MAIL_USER),
                    pass: this.configService.getOrThrow<string>(ENVEnum.MAIL_PASS),
                },
            },
            {
                debug: true,
                logger: true,
            },
        );
    }

    public async sendMail(
        to: string,
        subject: string,
        type: MailTemplateType,
        context: MailContext = {},
    ): Promise<void> {
        const html = this.renderTemplate(type, context);

        const mailOptions = {
            from: `"${appMetadata.displayName}" <${this.configService.get<string>(ENVEnum.MAIL_USER)}>`,
            to,
            subject,
            html,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            this.logger.log(`✅ Email sent to ${to} with subject "${subject}"`);
        } catch (error) {
            this.logger.error(`❌ Failed to send email to ${to}`, error.stack);
            throw new BadGatewayException(`❌ Failed to send email to ${to}`);
        }
    }

    private renderTemplate(type: MailTemplateType, context: MailContext): string {
        switch (type) {
            case "otp":
                return generateOtpEmail(context.otp!, context.expire!);
            case "friend-request":
                return generateFriendRequestEmail(context.senderName!, context.avatarUrl!);
            // if we have then make case here...
            default:
                throw new Error(`Unknown email template type: ${type}`);
        }
    }
}
