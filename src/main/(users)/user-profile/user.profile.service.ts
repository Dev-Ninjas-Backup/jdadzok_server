import { Injectable } from "@nestjs/common";
import { CreateUserProfileDto } from "./dto/user.profile.dto";
import { UserProfileRepository } from "./user.profile.repository";

@Injectable()
export class UserProfileService {
    constructor(private readonly profileRepository: UserProfileRepository) {}

    async get(userId: string) {
        return await this.profileRepository.find(userId);
    }

    async updateUserProfile(userId: string, data: CreateUserProfileDto) {
        return await this.profileRepository.updateUserProfile(userId, data);
    }

    async getUserProfile(userId: string, id: string) {
        return await this.profileRepository.getUserProfile(userId, id);
    }
}
