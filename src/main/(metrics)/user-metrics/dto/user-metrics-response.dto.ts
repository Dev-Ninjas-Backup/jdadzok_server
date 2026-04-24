import { ApiProperty } from "@nestjs/swagger";

export class UserMetricsResponseDto {
    @ApiProperty() id: string;
    @ApiProperty() userId: string;
    @ApiProperty() totalPosts: number;
    @ApiProperty() totalComments: number;
    @ApiProperty() totalLikes: number;
    @ApiProperty() totalShares: number;
    @ApiProperty() totalFollowers: number;
    @ApiProperty() totalFollowing: number;
    @ApiProperty() totalEarnings: number;
    @ApiProperty() currentMonthEarnings: number;
    @ApiProperty() volunteerHours: number;
    @ApiProperty() completedProjects: number;
    @ApiProperty() activityScore: number;
    @ApiProperty() createdAt: Date;
    @ApiProperty() updatedAt: Date;
}
