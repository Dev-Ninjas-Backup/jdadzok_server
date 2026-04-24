import { ApiBodyOptions } from "@nestjs/swagger";
import { preChoices } from "../constants";
import { CreateChoiceDto } from "../dto/choices.create.dto";

export const choicesBodyOptions: ApiBodyOptions = {
    isArray: true,
    type: CreateChoiceDto,
    description: "An array of choice objects",
    examples: {
        example1: {
            value: preChoices.splice(0, 3),
        },
        example2: {
            value: preChoices.splice(3, 6),
        },
    },
};
