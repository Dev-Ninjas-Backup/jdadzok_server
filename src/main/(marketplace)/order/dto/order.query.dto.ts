// import { ApiPropertyOptional } from '@nestjs/swagger';
// import { OrderStatus } from '@prisma/client';
// import { orderStatus } from 'constants';
// import { IsEnum, IsOptional, IsString } from 'class-validator';

// export class OrderQueryDto {

//     @ApiPropertyOptional({
//         example: '3543c671-a22e-415d-9a0e-2c1c51a27d32',
//         description: 'Filter by unique identifier of the product (UUID)',
//         type: String,
//         format: 'uuid',
//     })
//     @IsOptional()
//     @IsString()
//     productId?: string;

//     @ApiPropertyOptional({
//         example: 'PENDING',
//         description: 'Filter by order status',
//         enum: orderStatus,
//         enumName: 'orderStatus',
//     })
//     @IsOptional()
//     @IsEnum(orderStatus)
//     status?: OrderStatus;

//     // @ApiPropertyOptional({
//     //     example: '2025-08-01',
//     //     description: 'Filter orders created after this date (ISO string)',
//     //     type: String,
//     //     format: 'date-time',
//     // })
//     // @IsOptional()
//     // @IsString()
//     // createdAfter?: string;

//     // @ApiPropertyOptional({
//     //     example: '2025-08-27',
//     //     description: 'Filter orders created before this date (ISO string)',
//     //     type: String,
//     //     format: 'date-time',
//     // })
//     // @IsOptional()
//     // @IsString()
//     // createdBefore?: string;

//     // //  Pagination
//     // @ApiPropertyOptional({
//     //     example: 1,
//     //     description: 'Page number (default: 1)',
//     // })
//     // @IsOptional()
//     // @Type(() => Number)
//     // @IsNumber()
//     // @Min(1)
//     // page?: number = 1;

//     // @ApiPropertyOptional({
//     //     example: 10,
//     //     description: 'Number of items per page (default: 10)',
//     // })
//     // @IsOptional()
//     // @Type(() => Number)
//     // @IsNumber()
//     // @Min(1)
//     // limit?: number = 10;

//     // //  Sorting
//     // @ApiPropertyOptional({
//     //     example: 'createdAt',
//     //     description: 'Field to sort by (default: createdAt)',
//     // })
//     // @IsOptional()
//     // @IsString()
//     // sortBy?: string = 'createdAt';

//     // @ApiPropertyOptional({
//     //     example: 'desc',
//     //     description: 'Sort order (asc or desc, default: desc)',
//     // })
//     // @IsOptional()
//     // @IsString()
//     // sortOrder?: 'asc' | 'desc' = 'desc';
// }
