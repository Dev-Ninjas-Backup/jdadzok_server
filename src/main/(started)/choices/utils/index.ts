// some utils or parseChoiceInput file
import { slugify } from "@utils/index";
import { CreateChoiceDto } from "../dto/choices.create.dto";

export const parseChoiceInput = (userId: string, input: CreateChoiceDto[]): CreateChoiceDto[] => {
    return input.map((dto) => {
        return {
            text: dto.text, // assume dto has `text`
            slug: slugify(dto.text), // generate slug same way as in constants
            userId,
        };
    });
};
