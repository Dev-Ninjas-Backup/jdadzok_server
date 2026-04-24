import { Module } from "@nestjs/common";
import { MailModule } from "./mail/mail.module";
import { NotificationModule } from "./notification/notification.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SeedModule } from "./seed/seed.module";
import { UtilsModule } from "./utils/utils.module";

@Module({
    imports: [PrismaModule, SeedModule, MailModule, UtilsModule, NotificationModule],
    exports: [],
    providers: [],
})
export class LibModule {}
