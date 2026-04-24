import { PrismaService } from "@lib/prisma/prisma.service";
import { ApiResponse } from "@module/stripe/utils/api-response";
import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotAcceptableException,
    NotFoundException,
} from "@nestjs/common";
import { PaymentStatus } from "@prisma/client";
import Stripe from "stripe";
import { CreateOrderDto } from "./dto/order.dto";
@Injectable()
export class OrderService {
    private stripe: Stripe;

    constructor(private readonly prisma: PrismaService) {
        this.stripe = new Stripe(process.env.STRIPE_SECRET!);
    }

    // added new order.
    async add(userId: string, dto: CreateOrderDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user?.isVerified) throw new BadRequestException("Please verify your email.");

        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
            include: { seller: true },
        });
        if (!product) throw new BadRequestException("Product not found.");
        if (product.sellerId === userId)
            throw new BadRequestException("This product is unavailable for you.");
        if (product.availability < dto.quantity)
            throw new BadRequestException("Invalid order quantity.");

        if (!product.seller.stripeAccountId)
            throw new BadRequestException("Seller Is not ready to sell order.");

        const totalPrice = product.price * dto.quantity;
        if (totalPrice !== dto.totalPrice)
            throw new BadRequestException("Please enter a valid total price.");

        await this.prisma.product.update({
            where: { id: dto.productId },
            data: { availability: product.availability - dto.quantity },
        });

        const order = await this.prisma.order.create({
            data: {
                buyerId: userId,
                productId: dto.productId,
                quantity: dto.quantity,
                totalPrice,
                status: "PENDING",
                shippingAddress: dto.shippingAddress,
            },
            include: { buyer: true, product: true },
        });

        const totalAmount = Math.round(totalPrice * 100);
        const adminPercent = product.spent;
        const applicationFee = Math.round(totalAmount * adminPercent);
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: totalAmount,
            currency: "usd",
            automatic_payment_methods: { enabled: true },
            metadata: { orderId: order.id },
            transfer_data: {
                destination: product.seller.stripeAccountId,
            },
            application_fee_amount: applicationFee,
        });

        await this.prisma.payment.create({
            data: {
                stripeId: paymentIntent.id,
                amount: totalPrice,
                status: PaymentStatus.PENDING,
                orderId: order.id,
            },
        });

        return ApiResponse.success("Order created and payment intent generated", {
            order,
            clientSecret: paymentIntent.client_secret,
        });
    }

    // get all order...
    async findAll() {
        return this.prisma.order.findMany({});
    }

    // get a single order by id
    async findOne(id: string, userId: string) {
        const orderOwner = await this.prisma.order.findFirst({
            where: { buyerId: userId },
        });
        if (!orderOwner) {
            throw new ForbiddenException("Unauthorized Access.");
        }
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                buyer: true,
                product: true,
            },
        });
        if (!order) {
            throw new NotAcceptableException(`Order is not found`);
        }
        return order;
    }

    async myOrder(userId: string) {
        const user = await this.prisma.order.findFirst({ where: { buyerId: userId } });
        if (!user) {
            throw new NotFoundException("User is not found");
        }
        const order = await this.prisma.order.findFirst({
            where: { buyerId: userId },
        });
        return order;
    }
    // delete order
    async remove(id: string, userId: string) {
        const orderOwner = await this.prisma.order.findFirst({
            where: { buyerId: userId },
        });
        if (!orderOwner) {
            throw new ForbiddenException("Unauthorized Access.");
        }
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order) {
            throw new NotFoundException(`Order with ID ${id} not found`);
        }
        return this.prisma.order.delete({
            where: { id },
        });
    }
}
