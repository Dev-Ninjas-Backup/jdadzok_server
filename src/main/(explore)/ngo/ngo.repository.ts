import { PrismaService } from "@lib/prisma/prisma.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { slugify } from "@utils/index";
import { CreateNgoDto } from "./dto/ngo.dto";

@Injectable()
export class NgoRepository {
    constructor(private readonly prisma: PrismaService) {}

    // create new ngo......
    async createNgo(userId: string, dto: CreateNgoDto) {
        let generatedUsername: string;
        if (dto.profile) {
            if (dto.profile.name) {
                generatedUsername = dto.profile?.username;
            } else if (dto.profile.username) {
                generatedUsername = slugify(dto.profile.name, "-");
            }
        }
        return await this.prisma.$transaction(async (tx) => {
            const ngo = await tx.ngo.findFirst({
                where: {
                    ownerId: userId,
                    profile: {
                        is: {
                            username: dto.profile?.username,
                        },
                    },
                },
            });

            if (ngo) {
                throw new BadRequestException("Ngo Already Exist.");
            }

            return await this.prisma.ngo.create({
                data: {
                    owner: {
                        connect: { id: userId },
                    },
                    ngoType: dto.ngoType,
                    foundationDate: dto.foundationDate,
                    about: {
                        create: {
                            ...dto.about,
                        },
                    },
                    profile: {
                        create: {
                            ...dto.profile,
                            name: dto?.profile?.name ?? "",
                            username: generatedUsername,
                        },
                    },
                },
                include: {
                    about: true,
                    profile: true,
                },
            });
        });
    }
}
