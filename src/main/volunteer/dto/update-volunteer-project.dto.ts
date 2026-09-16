import { PartialType } from "@nestjs/swagger";
import { CreateVolunteerProjectDto } from "./create-volunteer-project.dto";

export class UpdateVolunteerProjectDto extends PartialType(CreateVolunteerProjectDto) {}
