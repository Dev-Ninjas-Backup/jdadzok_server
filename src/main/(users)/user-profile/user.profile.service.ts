import { Injectable } from "@nestjs/common";
import { CreateUserProfileDto } from "./dto/user.profile.dto";
import { CapArtPreferencesDto } from "./dto/cap-art-preferences.dto";
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

    async setVolunteerMentorOptIn(userId: string, isVolunteerMentorOptIn: boolean) {
        return await this.profileRepository.setVolunteerMentorOptIn(
            userId,
            isVolunteerMentorOptIn,
        );
    }

    async setCapArtPreferences(userId: string, dto: CapArtPreferencesDto) {
        return await this.profileRepository.setCapArtPreferences(userId, dto);
    }

    async getCapArtPreferences(userId: string) {
        return await this.profileRepository.getCapArtPreferences(userId);
    }

    async getUserProfile(userId: string, id: string) {
        return await this.profileRepository.getUserProfile(userId, id);
    }
}
