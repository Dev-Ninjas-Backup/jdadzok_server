import { Injectable } from "@nestjs/common";
import { CreateUserProfileMetricsDto } from "./dto/user.profile.metrics";

@Injectable()
export class UserProfileMetricsService {
    constructor() {}
    async create(userId: string, input: CreateUserProfileMetricsDto) {
        return { userId, input };
    }
}
