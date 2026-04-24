import { PrismaModule } from "@lib/prisma/prisma.module";
import { CapRequirementsSeedService } from "@lib/seed/services/cap-requirements.seed.service";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

@Module({
    imports: [PrismaModule],
    providers: [CapRequirementsSeedService],
})
class SeedAppModule {}

async function bootstrap() {
    console.info("🚀 Starting Cap Requirements Seeding...\n");

    const app = await NestFactory.createApplicationContext(SeedAppModule);
    const seedService = app.get(CapRequirementsSeedService);

    try {
        await seedService.seedCapRequirements();
        console.info("\n✅ Cap Requirements seeding completed successfully!");
    } catch (error) {
        console.error("\n❌ Error during Cap Requirements seeding:", error);
        process.exit(1);
    } finally {
        await app.close();
    }
}

bootstrap();
