import { faker } from "@faker-js/faker";
import { AuthProvider, CapLevel, MediaType, Role } from "@prisma/client";

export const generateUserData = async () => {
    return {
        email: faker.internet.email(),
        authProvider: AuthProvider.GOOGLE,
        isVerified: faker.datatype.boolean(),
        role: Role.USER,
        capLevel: CapLevel.NONE,
        profile: {
            create: {
                name: faker.internet.displayName(),
                username: faker.internet.username(),
                avatarUrl: faker.image.avatar(),
                coverUrl: faker.image.url(),
                location: faker.location.city(),
            },
        },
        about: {
            create: {
                website: faker.internet.url(),
                work: faker.company.name(),
            },
        },
        metrics: {
            create: {
                totalPosts: 3,
                totalFollowers: 0,
                totalFollowing: 0,
            },
        },
        posts: {
            create: Array.from({ length: 3 }).map(() => ({
                text: faker.lorem.sentence(),
                mediaUrls: [faker.image.url()],
                mediaType: MediaType.IMAGE,
            })),
        },
    };
};
