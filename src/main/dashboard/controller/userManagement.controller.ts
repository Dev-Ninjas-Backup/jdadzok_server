import {
    Controller,
    Get,
    Query,
    Patch,
    Param,
    Res,
    UseGuards,
    ForbiddenException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/index";
import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { PrismaService } from "@lib/prisma/prisma.service";
import { GetUsersQueryDto } from "../dto/query.dto";
import { UserManagementService } from "../service/userManagement.service";

@ApiTags("User-management")
@Controller("admin/userManagement")
export class UserManagementController {
    constructor(
        private readonly userManagementService: UserManagementService,
        private readonly prisma: PrismaService,
    ) {}

    @ApiOperation({ summary: "Super Admin: Get all user overview statistics" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("user-overview")
    async getUserOverview(@GetVerifiedUser() user: VerifiedUser) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbiden accesss");
        return this.userManagementService.getUserOverview();
    }

    @ApiOperation({ summary: "Super Admin: List users with search & filters" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("users")
    async getUsers(@GetVerifiedUser() user: VerifiedUser, @Query() query: GetUsersQueryDto) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbiden accesss");
        const { search, status, role, page, limit } = query;
        const users = await this.userManagementService.getUsers({
            search,
            status,
            role,
            page: page ?? 1,
            limit: limit ?? 10,
        });

        return users;
    }

    @ApiOperation({ summary: "Super Admin: Export users matching filters as CSV" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get("users/export")
    async exportUsers(
        @GetVerifiedUser() user: VerifiedUser,
        @Query() query: GetUsersQueryDto,
        @Res() res: Response,
    ) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbiden accesss");
        const { search, status, role } = query;
        const csv = await this.userManagementService.exportUsers({ search, status, role });
        res.set({
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="users.csv"',
        });
        res.send(csv);
    }

    @ApiOperation({ summary: "Super Admin: Suspend a user" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch("users/:id/suspend")
    async suspendUser(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbiden accesss");
        return this.userManagementService.suspendUser(id);
    }

    @ApiOperation({ summary: "Super Admin: Activate a user" })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Patch("users/:id/activate")
    async activateUser(@GetVerifiedUser() user: VerifiedUser, @Param("id") id: string) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenException("Forbiden accesss");
        return this.userManagementService.activateUser(id);
    }
}
