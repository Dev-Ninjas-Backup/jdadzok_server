import { ConflictException, Injectable } from "@nestjs/common";

@Injectable()
export class PostUtils {
    constructor() {}

    public extractTagsId(input: string) {
        const split = input.split(",");
        if (split.length > 0) {
            return split;
        } else {
            return undefined;
        }
    }
    public extractBoolean(input: string) {
        return input === "false" ? false : input.startsWith("true") ? true : false;
    }
    public include<const T extends readonly string[]>(arr: T, input: T[number]): T[number] {
        if (!arr.includes(input)) {
            throw new ConflictException(
                `Invalid input '${input}'. Must be one of: ${arr.join(", ")}`,
            );
        }
        return input;
    }
}
