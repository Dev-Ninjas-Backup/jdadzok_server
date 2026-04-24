import { PrismaService } from "@lib/prisma/prisma.service";
import { HelperFunctions } from "@module/(core)/feeds/functions/helper";
import { PostsMetricsRepository } from "@module/(metrics)/posts-metrics/posts-metrics.repository";
import { UserRepository } from "@module/(users)/users/users.repository";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AdvanceQueryBuilder } from "@service/query-builder.service";
import { HelperTx } from "@type/index";
import { GifRepository } from "../gif/gif.repository";
import { LocationRepository } from "../locations/locations.repository";
import { CreatePostMetadataDto } from "../post-metadata/dto/post.metadata.dto";
import { PostMetadataRepository } from "../post-metadata/post.metadata.repository";
import { PostTagsRepository } from "../post-tags/post-tags.repository";
import { CreatePostDto, UpdatePostDto } from "./dto/create.post.dto";

@Injectable()
export class PostRepository {
    private readonly queryBuilder = new AdvanceQueryBuilder();

    constructor(
        private readonly prisma: PrismaService,
        private readonly tagsRepo: PostTagsRepository,
        private readonly locationRepo: LocationRepository,
        private readonly gifRepo: GifRepository,
        private readonly metadataRepo: PostMetadataRepository,
        private readonly userRepo: UserRepository,
        // ngo & community
        private readonly postMetricsRepository: PostsMetricsRepository,
        private readonly helperFunctions: HelperFunctions,
    ) {}

    private readonly defaultInclude = {
        metadata: {
            include: {
                gif: true,
                checkIn: true,
            },
        },
    };

    async store(input: CreatePostDto) {
        const { metadata, taggedUserIds, ...postData } = input;

        return await this.prisma.$transaction(async (tx) => {
            if (!postData.authorId) throw new NotFoundException("Request user not found!");

            let metadataId = input.metadataId;
            if (metadata && !metadataId) {
                metadataId = await this.createMetadata(tx, metadata);
            }
            switch (input.postFrom) {
                case "NGO":
                    console.info("ngo");
                    break;
                case "COMMUNITY":
                    console.info("community");
                    break;
                case "REGULAR_PROFILE":
                    console.info("regular");
                    break;
                default:
                    console.info("default");
            }
            const postForAuthor = await tx.post.create({
                data: {
                    ...postData,
                    postFrom: postData.postFrom,
                    authorId: postData.authorId,
                    metadataId,
                },
                include: {
                    author: { include: { profile: true } },
                    category: true,
                    community: { include: { profile: true } },
                    ngo: { include: { profile: true } },
                    metadata: { include: { checkIn: true, gif: true } },
                },
            });

            await this.postMetricsRepository.create({ postId: postForAuthor.id }, tx);

            await tx.userMetrics.upsert({
                where: { userId: postData.authorId },
                create: { userId: postData.authorId, totalPosts: 1 },
                update: { totalPosts: { increment: 1 }, lastUpdated: new Date() },
            });

            if (taggedUserIds && taggedUserIds.length > 0) {
                await this.handleTaggedUsers(
                    tx,
                    taggedUserIds,
                    input,
                    metadataId,
                    postForAuthor.id,
                );
                await this.helperFunctions.createTagNotifications(
                    postForAuthor.id,
                    input.authorId!,
                    taggedUserIds,
                );
            }
            return tx.post.findUnique({
                where: { id: postForAuthor.id },
                include: {
                    ...this.defaultInclude,
                    author: {
                        omit: { password: true },
                        include: {
                            profile: {
                                select: {
                                    name: true,
                                    username: true,
                                    coverUrl: true,
                                    avatarUrl: true,
                                    bio: true,
                                },
                            },
                        },
                    },
                },
            });
        });
    }

    async update(id: string, data: UpdatePostDto) {
        return await this.prisma.$transaction(async (tx) => {
            const { metadata, ...input } = data;
            let updatedMetadataId = input.metadataId;

            if (metadata) {
                updatedMetadataId = await this.updateOrCreateMetadata(
                    tx,
                    input.metadataId,
                    metadata,
                );
            } else if (input.metadataId && !metadata) {
                await this.cleanupMetadata(tx, input.metadataId);
                updatedMetadataId = undefined;
            }

            const updatedPost = await tx.post.update({
                where: {
                    id,
                    authorId: input.authorId!,
                },
                data: {
                    ...input,
                    metadataId: updatedMetadataId,
                },
                include: this.defaultInclude,
            });
            return updatedPost;
        });
    }

    async delete(id: string) {
        return await this.prisma.$transaction(async (tx) => {
            await tx.postTagUser.deleteMany({
                where: { postId: id },
            });

            const deletedPost = await tx.post.delete({
                where: { id },
                include: this.defaultInclude,
            });

            if (deletedPost.metadataId) {
                const otherPostsWithSameMetadata = await tx.post.count({
                    where: {
                        metadataId: deletedPost.metadataId,
                        id: { not: id },
                    },
                });

                if (otherPostsWithSameMetadata === 0) {
                    await this.cleanupMetadata(tx, deletedPost.metadataId);
                }
            }

            return deletedPost;
        });
    }

    private async updateOrCreateMetadata(
        tx: HelperTx,
        metadataId: string | undefined,
        metadataDto: CreatePostMetadataDto,
    ) {
        if (metadataId) {
            // update existing metadata
            const existingMetadata = await tx.postMetadata.findUnique({
                where: { id: metadataId },
                include: { checkIn: true, gif: true },
            });

            if (!existingMetadata) {
                // This is an edge case, but it's good practice to handle it.
                // If the metadata ID is invalid, create new metadata instead.
                return await this.createMetadata(tx, metadataDto);
            }

            let newLocationId = existingMetadata.checkInId;
            if (metadataDto.checkIn) {
                const location = await this.locationRepo.txStore(tx, metadataDto.checkIn);
                newLocationId = location.id;
            } else if (!metadataDto.checkIn) {
                // If checkIn is explicitly null, delete the old location
                if (existingMetadata.checkInId) {
                    await this.cleanupLocation(tx, existingMetadata.checkInId, metadataId);
                }
                newLocationId = null;
            }

            let newGifId = existingMetadata.gifId;
            if (metadataDto.gif) {
                const gif = await this.gifRepo.txStore(tx, metadataDto.gif);
                newGifId = gif.id;
            } else if (!metadataDto.gif) {
                // If gif is explicitly null, delete the old gif
                if (existingMetadata.gifId) {
                    await this.cleanupGif(tx, existingMetadata.gifId, metadataId);
                }
                newGifId = null;
            }

            const updatedMetadata = await this.metadataRepo.txUpdate(tx, metadataId, {
                ...metadataDto,
                checkInId: newLocationId!,
                gifId: newGifId!,
            });

            return updatedMetadata.id;
        } else {
            // create new metadata since none existed before
            return await this.createMetadata(tx, metadataDto);
        }
    }

    private async createMetadata(tx: HelperTx, metadata: CreatePostMetadataDto): Promise<string> {
        let locationId: string | undefined;
        let gifId: string | undefined;

        if (metadata.checkIn) {
            const location = await this.locationRepo.txStore(tx, metadata.checkIn);
            locationId = location.id;
        }

        if (metadata.gif) {
            const gif = await this.gifRepo.txStore(tx, metadata.gif);
            gifId = gif.id;
        }

        const postMetadata = await this.metadataRepo.txStore(tx, {
            checkInId: locationId,
            gifId,
            feelings: metadata.feelings ?? "HAPPY",
        });

        return postMetadata.id;
    }

    private async handleTaggedUsers(
        tx: HelperTx,
        taggedUserIds: string[],
        input: Omit<CreatePostDto, "metadata">,
        metadataId: string | undefined,
        originalPostId: string,
    ): Promise<void> {
        if (taggedUserIds.includes(input.authorId!)) {
            throw new ConflictException("You can not tag yourself");
        }

        const users = await tx.user.findMany({
            where: { id: { in: taggedUserIds } },
            select: { id: true },
        });

        if (users.length !== taggedUserIds.length) {
            throw new NotFoundException("One or more tagged users not found");
        }

        await tx.postTagUser.createMany({
            data: taggedUserIds.map((userId) => ({
                postId: originalPostId,
                userId,
            })),
            skipDuplicates: true,
        });
    }

    private async cleanupMetadata(tx: HelperTx, metadataId: string): Promise<void> {
        try {
            const metadata = await tx.postMetadata.findUnique({
                where: { id: metadataId },
                include: { checkIn: true, gif: true },
            });

            if (!metadata) return;

            if (metadata.checkInId) {
                await this.cleanupLocation(tx, metadata.checkInId, metadata.id);
            }

            if (metadata.gifId) {
                await this.cleanupGif(tx, metadata.gifId, metadata.id);
            }

            if (metadataId) await tx.postMetadata.delete({ where: { id: metadataId } });
        } catch (error) {
            console.warn("Failed to cleanup metadata:", error);
        }
    }
    private async cleanupLocation(tx: HelperTx, locationId: string, currentMetadataId: string) {
        const count = await tx.postMetadata.count({
            where: {
                checkInId: locationId,
                id: {
                    not: currentMetadataId,
                },
            },
        });
        if (count === 0) await tx.location.delete({ where: { id: locationId } });
    }
    private async cleanupGif(
        tx: HelperTx,
        gifId: string,
        currentMetadataId: string,
    ): Promise<void> {
        const count = await tx.postMetadata.count({
            where: {
                gifId: gifId,
                id: { not: currentMetadataId },
            },
        });

        if (count === 0) {
            await tx.gif.delete({ where: { id: gifId } });
        }
    }

    async findRecentPosts({ authorIds, limit }: { authorIds?: string[]; limit: number }) {
        return this.prisma.post.findMany({
            where: {
                visibility: "PUBLIC",
                ...(authorIds ? { authorId: { in: authorIds } } : {}),
            },
            include: {
                author: true,
                likes: true,
                shares: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
        });
    }
    /**
     * Finds a post by ID with dynamic select and include options.
     * @param {string} id - The ID of the post.
     * @param {Prisma.PostSelect} select - Fields to select from the post.
     * @param {Prisma.PostInclude} include - Relations to include.
     * @param {Prisma.PostWhereUniqueInput} where - Optional filters to apply for the post query.
     */
    async findById(
        id: string,
        select: Prisma.PostSelect = { id: true, ...this.defaultInclude },
        where: Prisma.PostWhereUniqueInput = { id },
    ) {
        try {
            const whereClause: Prisma.PostWhereUniqueInput = where || { id };
            const result = await this.prisma.post.findUnique({
                where: whereClause,
                select,
            });

            if (!result) {
                throw new NotFoundException(`Post not found with ID: ${id}`);
            }

            return result;
        } catch (err) {
            throw new NotFoundException(`Post not found with that uuid: ${id}`, {
                description: err.message,
            });
        }
    }
}
