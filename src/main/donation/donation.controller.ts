import { JwtAuthGuard } from "@module/(started)/auth/guards/jwt-auth";
import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { DonationService } from "./donation.service";
import { DonationDto } from "./dto/donation.dto";
import { handleRequest } from "@common/utils/handle.request.util";
import { GetVerifiedUser } from "@common/jwt/jwt.decorator";
import { VerifiedUser } from "@type/shared.types";

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("donation")
export class DonationController {
    constructor(private readonly service: DonationService) {}

    @Post("ngo")
    donateToNgo(@GetVerifiedUser() user: VerifiedUser, @Body() dto: DonationDto) {
        return handleRequest(
            () => this.service.donateToNgo(user.id, dto),
            "Donation payment successfully",
        );
    }

    @Get("myDonation")
    async donorDonations(@GetVerifiedUser() user: VerifiedUser) {
        return this.service.getDonorDonations(user.id);
    }

    @Get("ngo/:ngoId")
    async ngoDonations(@Param("ngoId") ngoId: string) {
        return handleRequest(
            () => this.service.getNgoDonations(ngoId),
            "Donation payment successfully",
        );
    }
}
