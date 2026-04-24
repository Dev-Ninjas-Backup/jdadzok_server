import { ENVEnum } from "@common/enum/env.enum";
import { PrismaService } from "@lib/prisma/prisma.service";
import { UtilsService } from "@lib/utils/utils.service";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class SuperAdminService implements OnModuleInit {
    private readonly logger = new Logger(SuperAdminService.name);
    private superAdminEmail: string;
    private superAdminPass: string;

    constructor(
        private readonly prisma: PrismaService,
        private readonly utils: UtilsService,
        private readonly configService: ConfigService,
    ) {
        this.superAdminEmail = this.configService.getOrThrow<string>(ENVEnum.SUPER_ADMIN_EMAIL);
        this.superAdminPass = this.configService.getOrThrow<string>(ENVEnum.SUPER_ADMIN_PASS);
    }

    async onModuleInit() {
        // Seed super admin if it doesn't exist
        await this.seedSuperAdminUser();
    }

    /**
     * Check if the Super Admin user exists. If not, create it.
     */
    private async seedSuperAdminUser(): Promise<void> {
        const superAdminExists = await this.checkIfUserExists(this.superAdminEmail);

        if (!superAdminExists) {
            await this.createSuperAdminUser();
        } else {
            this.logger.log(`🚀 Super Admin already exists`);
        }
    }

    /**
     * Checks if a user already exists by their email.
     * @param email - The email of the user to check.
     * @returns {Promise<boolean>}
     */
    private async checkIfUserExists(email: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        return Boolean(user); // Returns true if user exists, false otherwise
    }

    /**
     * Create the Super Admin user.
     */
    private async createSuperAdminUser(): Promise<void> {
        const password = await this.hashPassword(this.superAdminPass);

        await this.prisma.user.create({
            data: {
                email: this.superAdminEmail,
                password,
                isVerified: true,
                authProvider: "EMAIL",
                role: "SUPER_ADMIN",
            },
        });

        this.logger.debug(`🚀 Super Admin created.`);
    }

    private async hashPassword(password: string): Promise<string> {
        return await this.utils.hash(password);
    }
}
