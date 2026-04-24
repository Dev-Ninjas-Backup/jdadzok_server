import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SimpleBaseQueryDto } from "./dto/simple.base.query.dto";

/**
 * @description
 * A generic and dynamic service to build Prisma query objects
 * from a DTO, supporting pagination, searching, ordering, includes, and selects.
 */
@Injectable()
export class SimpleQueryBuilderService {
    /**
     * Builds a Prisma `findMany` query object dynamically based on a BaseQueryDto.
     * @param queryDto The DTO containing query parameters.
     * @param modelName The name of the Prisma model (e.g., 'User', 'Post').
     * @returns A Prisma query object suitable for `findMany`.
     */
    public buildQuery<T>(queryDto: SimpleBaseQueryDto): Prisma.Args<T, "findMany"> {
        const query: Prisma.Args<any, "findMany"> = {};

        // 1. Handle Pagination (traditional & cursor)
        if (queryDto.cursor) {
            query.cursor = { id: queryDto.cursor }; // Assumes 'id' as the cursor field
            if (queryDto.take) {
                query.take = queryDto.take;
            }
        } else {
            if (queryDto.skip) {
                query.skip = queryDto.skip;
            }
            if (queryDto.take) {
                query.take = queryDto.take;
            }
        }

        // 2. Handle Order
        if (queryDto.order && queryDto.order.length > 0) {
            query.orderBy = queryDto.order.map((item) => {
                const [field, direction] = item.split(":");
                return { [field]: direction.toLowerCase() };
            });
        }

        // 3. Handle Search
        if (queryDto.search && queryDto.searchFields) {
            try {
                const searchFields = JSON.parse(queryDto.searchFields);
                if (Array.isArray(searchFields)) {
                    query.where = {
                        OR: searchFields.map((field) => ({
                            [field]: {
                                contains: queryDto.search,
                                mode: Prisma.QueryMode.insensitive,
                            },
                        })),
                    };
                }
            } catch (e) {
                console.error("Failed to parse searchFields JSON:", e);
            }
        }

        // 4. Handle Nested Includes
        if (queryDto.include) {
            try {
                query.include = JSON.parse(queryDto.include);
            } catch (e) {
                console.error("Failed to parse include JSON:", e);
            }
        }

        // 5. Handle Select
        if (queryDto.select) {
            try {
                query.select = JSON.parse(queryDto.select);
            } catch (e) {
                console.error("Failed to parse select JSON:", e);
            }
        }

        return query;
    }
}
