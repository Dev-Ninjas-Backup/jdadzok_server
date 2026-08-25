import { Injectable, Logger } from "@nestjs/common";
import { CreateUserProfileDto } from "./dto/user.profile.dto";
import { CapArtPreferencesDto } from "./dto/cap-art-preferences.dto";
import { UserProfileRepository } from "./user.profile.repository";
import { SearchSyncService } from "@module/(search)/search-sync.service";

@Injectable()
export class UserProfileService {
    private readonly logger = new Logger(UserProfileService.name);

    constructor(
        private readonly profileRepository: UserProfileRepository,
        private readonly searchSync: SearchSyncService,
    ) {}

    async get(userId: string) {
        return await this.profileRepository.find(userId);
    }

    async updateUserProfile(userId: string, data: CreateUserProfileDto) {
        const updated = await this.profileRepository.updateUserProfile(userId, data);
        await this.safeSearchUpsert(userId);
        return updated;
    }

    async setVolunteerMentorOptIn(userId: string, isVolunteerMentorOptIn: boolean) {
        const updated = await this.profileRepository.setVolunteerMentorOptIn(
            userId,
            isVolunteerMentorOptIn,
        );
        await this.safeSearchUpsert(userId);
        return updated;
    }

    async setTalentSearchOptIn(userId: string, isTalentSearchOptIn: boolean) {
        return await this.profileRepository.setTalentSearchOptIn(userId, isTalentSearchOptIn);
    }

    async getTalentSearchVisibility(userId: string) {
        return await this.profileRepository.getTalentSearchVisibility(userId);
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

    private async safeSearchUpsert(userId: string) {
        try {
            await this.searchSync.upsertMember(userId);
        } catch (err) {
            this.logger.warn(`Search upsert failed for member ${userId}: ${String(err)}`);
        }
    }
}
