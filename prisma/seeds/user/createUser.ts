import { PrismaClient } from "@prisma/client";
import { generateUserData } from "./generateUserData";

export const createUser = async (prisma: PrismaClient) => {
    const userData = await generateUserData();
    return await prisma.user.create({ data: userData });
};
