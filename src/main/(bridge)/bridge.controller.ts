import { GetUser, MakePublic, ValidateAuth } from "@common/jwt/jwt.decorator";
import { successResponse } from "@common/utils/response.util";
import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { BridgeService } from "./bridge.service";
import {
    BridgeListQueryDto,
    CreateBridgeBookingDto,
    CreateBridgeListingDto,
    RespondBridgeBookingDto,
    UpdateBridgeListingDto,
} from "./dto/bridge.dto";

@ApiTags("The Bridge")
@Controller("bridge")
export class BridgeController {
    constructor(private readonly bridgeService: BridgeService) {}

    @Get()
    @MakePublic()
    @ApiOperation({
        summary: "Discover Bridge listings (Cap-weighted visibility)",
        description:
            "Higher Caps rank above lower Caps. Separate from goods Product/Order marketplace.",
    })
    async discover(@Query() query: BridgeListQueryDto) {
        const data = await this.bridgeService.listDiscover(query);
        return successResponse(data, "Bridge listings retrieved (Cap-weighted)");
    }

    @Get("me")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "My Bridge listings" })
    async myListings(@GetUser("userId") userId: string) {
        const data = await this.bridgeService.listMine(userId);
        return successResponse(data, "Your Bridge listings retrieved");
    }

    @Get("fee-policy")
    @MakePublic()
    @ApiOperation({
        summary: "Bridge paid-gig platform fee policy",
        description: "Small cut of gig worker payout (default 5%). Stripe settlement is separate.",
    })
    async feePolicy() {
        const data = this.bridgeService.getFeePolicy();
        return successResponse(data, "Bridge fee policy");
    }

    @Get("bookings/me")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "My Bridge bookings (as client or provider)" })
    async myBookings(@GetUser("userId") userId: string) {
        const data = await this.bridgeService.listMyBookings(userId);
        return successResponse(data, "Your Bridge bookings retrieved");
    }

    @Get("bookings/:bookingId")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Get a Bridge booking with fee breakdown" })
    async getBooking(
        @GetUser("userId") userId: string,
        @Param("bookingId") bookingId: string,
    ) {
        const data = await this.bridgeService.getBooking(userId, bookingId);
        return successResponse(data, "Bridge booking retrieved");
    }

    @Patch("bookings/:bookingId/complete")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Mark an accepted Bridge booking completed (sets payout ready for settlement)",
    })
    async complete(
        @GetUser("userId") userId: string,
        @Param("bookingId") bookingId: string,
    ) {
        const data = await this.bridgeService.completeBooking(userId, bookingId);
        return successResponse(data, "Bridge booking completed");
    }

    @Patch("bookings/:bookingId/respond")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Accept or decline a booking (listing owner)" })
    async respond(
        @GetUser("userId") userId: string,
        @Param("bookingId") bookingId: string,
        @Body() dto: RespondBridgeBookingDto,
    ) {
        const data = await this.bridgeService.respondBooking(userId, bookingId, dto);
        return successResponse(data, "Bridge booking updated");
    }

    @Post()
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Create a Bridge listing (EXPERTISE | GIG | PROJECT_HELP)",
    })
    async create(@GetUser("userId") userId: string, @Body() dto: CreateBridgeListingDto) {
        const data = await this.bridgeService.createListing(userId, dto);
        return successResponse(data, "Bridge listing created");
    }

    @Post(":id/book")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({
        summary: "Request a booking on a Bridge gig / expertise listing",
    })
    async book(
        @GetUser("userId") userId: string,
        @Param("id") id: string,
        @Body() dto: CreateBridgeBookingDto,
    ) {
        const data = await this.bridgeService.createBooking(userId, id, dto);
        return successResponse(data, "Bridge booking requested");
    }

    @Patch(":id")
    @ValidateAuth()
    @ApiBearerAuth()
    @ApiOperation({ summary: "Update own Bridge listing (refreshes Cap snapshot)" })
    async update(
        @GetUser("userId") userId: string,
        @Param("id") id: string,
        @Body() dto: UpdateBridgeListingDto,
    ) {
        const data = await this.bridgeService.updateListing(userId, id, dto);
        return successResponse(data, "Bridge listing updated");
    }

    @Get(":id")
    @MakePublic()
    @ApiOperation({ summary: "Get a Bridge listing by id" })
    async getOne(@Param("id") id: string) {
        const data = await this.bridgeService.getListing(id);
        return successResponse(data, "Bridge listing retrieved");
    }
}
