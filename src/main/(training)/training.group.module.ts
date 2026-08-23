import { Module } from "@nestjs/common";
import { TrainingModule } from "./training.module";

@Module({
    imports: [TrainingModule],
    exports: [TrainingModule],
})
export class TrainingGroupModule {}
