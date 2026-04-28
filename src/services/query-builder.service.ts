import {
    Include,
    IncludeConfig,
    ModelIncludeInput,
    ModelWhereInput,
    OrderBy,
    QueryConfig,
    QueryDto,
    Select,
    Where,
} from "./@types";

/**
 * @deprecated this build is now deprecated
 */
class QueryBuilderService {
    public buildQuery<
        WhereInput extends ModelWhereInput,
        IncludeInput extends ModelIncludeInput,
        ModelDto,
    >(queryDto: ModelDto, whereBuilder?: (search: string) => WhereInput) {
        const {
            page,
            limit,
            search,
            sortBy,
            order,
            include: includes,
            orderBy: dtoOrderBy,
        } = queryDto as any;

        const skip = page && limit ? (page - 1) * limit : 0;
        const take = limit ?? undefined;

        let where: WhereInput | undefined;
        if (search && whereBuilder) {
            where = whereBuilder(search);
        }

        const orderBy = sortBy && order ? { [sortBy]: order } : dtoOrderBy;

        const include = includes as IncludeInput;

        return {
            skip,
            take,
            where,
            orderBy,
            include,
        };
    }
}
export default new QueryBuilderService();

export class AdvanceQueryBuilder {
    /**
     * Recursively processes and validates select configuration
     */
    private processSelect<T>(select: Select<T> | undefined): Select<T> | undefined {
        if (!select || typeof select !== "object") {
            return select;
        }

        const processed = {} as Select<T>;

        for (const [key, value] of Object.entries(select)) {
            if (typeof value === "boolean") {
                (processed as any)[key] = value;
            } else if (typeof value === "object" && value !== null) {
                (processed as any)[key] = this.processSelect(value);
            }
        }

        return processed;
    }

    /**
     * Recursively processes include configuration with full type safety
     */
    private processInclude<T>(include: Include<T> | undefined): Include<T> | undefined {
        if (!include || typeof include !== "object") {
            return include;
        }

        if (Array.isArray(include)) {
            // Handle array format: ['relation1', 'relation2']
            return include.reduce((acc, item) => {
                if (typeof item === "string") {
                    acc[item] = true;
                } else if (typeof item === "object") {
                    Object.assign(acc, this.processInclude(item));
                }
                return acc;
            }, {} as Include<T>);
        }

        const processed = {} as Include<T>;

        for (const [key, value] of Object.entries(include)) {
            if (typeof value === "boolean") {
                (processed as any)[key] = value;
            } else if (typeof value === "object" && value !== null) {
                (processed as any)[key] = this.processIncludeConfig(value);
            }
        }

        return processed;
    }

    /**
     * Processes include configuration object
     */
    private processIncludeConfig<T>(config: IncludeConfig<T>): IncludeConfig<T> {
        const processed: IncludeConfig<T> = {};

        if (config.select) {
            processed.select = this.processSelect(config.select);
        }

        if (config.include) {
            processed.include = this.processInclude(config.include);
        }

        if (config.where) {
            processed.where = this.processWhere(config.where);
        }

        if (config.orderBy) {
            processed.orderBy = this.processOrderBy(config.orderBy);
        }

        if (config.take !== undefined) {
            processed.take = config.take;
        }

        if (config.skip !== undefined) {
            processed.skip = config.skip;
        }

        if (config.distinct) {
            processed.distinct = config.distinct;
        }

        return processed;
    }

    /**
     * Processes where conditions with type safety
     */
    private processWhere<T>(where: Where<T> | undefined): Where<T> | undefined {
        if (!where || typeof where !== "object") {
            return where;
        }

        const processed = {} as Where<T>;

        for (const [key, value] of Object.entries(where)) {
            if (key === "AND" || key === "OR") {
                (processed as any)[key] = Array.isArray(value)
                    ? value.map((condition) => this.processWhere(condition))
                    : this.processWhere(value);
            } else if (key === "NOT") {
                (processed as any)[key] = this.processWhere(value as any);
            } else if (typeof value === "object" && value !== null) {
                // Handle nested where conditions
                (processed as any)[key] = this.processWhereOperators(value);
            } else {
                (processed as any)[key] = value;
            }
        }

        return processed;
    }

    /**
     * Processes where operators (equals, in, contains, etc.)
     */
    private processWhereOperators(operators: any): any {
        if (!operators || typeof operators !== "object") {
            return operators;
        }

        const processed: any = {};

        for (const [operator, value] of Object.entries(operators)) {
            switch (operator) {
                case "some":
                case "every":
                case "none":
                    processed[operator] = this.processWhere(value as any);
                    break;
                case "not":
                    processed[operator] =
                        typeof value === "object" && value !== null
                            ? this.processWhereOperators(value)
                            : value;
                    break;
                default:
                    processed[operator] = value;
            }
        }

        return processed;
    }

    /**
     * Processes orderBy configuration
     */
    private processOrderBy<T>(
        orderBy: OrderBy<T> | OrderBy<T>[] | undefined,
    ): OrderBy<T> | OrderBy<T>[] | undefined {
        if (!orderBy) {
            return orderBy;
        }

        if (Array.isArray(orderBy)) {
            return orderBy.map((order) => this.processOrderBy(order) as OrderBy<T>);
        }

        if (typeof orderBy !== "object") {
            return orderBy;
        }

        const processed = {} as OrderBy<T>;

        for (const [key, value] of Object.entries(orderBy)) {
            if (typeof value === "string" && (value === "asc" || value === "desc")) {
                (processed as any)[key] = value;
            } else if (typeof value === "object" && value !== null) {
                (processed as any)[key] = this.processOrderBy(value);
            }
        }

        return processed;
    }

    /**
     * Validates query configuration
     */
    private validateQuery<T>(config: QueryConfig<T>): boolean {
        // Add custom validation logic here
        if (config.take !== undefined && config.take < 0) {
            throw new Error("take must be non-negative");
        }

        if (config.skip !== undefined && config.skip < 0) {
            throw new Error("skip must be non-negative");
        }

        return true;
    }

    /**
     * Main query building method with full type safety
     */
    public buildQuery<T>(
        queryDto: QueryDto<T>,
        whereBuilder?: (search: string, existingWhere?: Where<T>) => Where<T>,
    ): QueryConfig<T> {
        const {
            page,
            limit,
            search,
            sortBy,
            order,
            select,
            include,
            where: dtoWhere,
            orderBy: dtoOrderBy,
            distinct,
            cursor,
        } = queryDto;

        // Calculate pagination
        const skip = page && limit ? (page - 1) * limit : undefined;
        const take = limit ?? undefined;

        // Build where clause
        let where: Where<T> | undefined = this.processWhere(dtoWhere);
        if (search && whereBuilder) {
            const searchWhere = whereBuilder(search, where);
            where = where ? ({ AND: [where, searchWhere] } as Where<T>) : searchWhere;
        }

        // Build orderBy clause
        let orderBy: OrderBy<T> | OrderBy<T>[] | undefined;
        if (sortBy && order) {
            const dynamicOrderBy = { [sortBy]: order } as OrderBy<T>;
            orderBy = dtoOrderBy
                ? Array.isArray(dtoOrderBy)
                    ? [dynamicOrderBy, ...dtoOrderBy]
                    : [dynamicOrderBy, dtoOrderBy]
                : dynamicOrderBy;
        } else {
            orderBy = this.processOrderBy(dtoOrderBy);
        }

        const config: QueryConfig<T> = {
            select: this.processSelect(select),
            include: this.processInclude(include),
            where,
            orderBy,
            take,
            skip,
            distinct,
            cursor,
        };

        // Remove undefined values
        const cleanConfig = Object.fromEntries(
            Object.entries(config).filter(([, value]) => value !== undefined),
        ) as QueryConfig<T>;

        this.validateQuery(cleanConfig);

        return cleanConfig;
    }

    /**
     * Helper to create type-safe where conditions
     */
    public createWhere<T>(): WhereBuilder<T> {
        return new WhereBuilder<T>();
    }

    /**
     * Helper to merge multiple queries
     */
    public mergeQueries<T>(...queries: Partial<QueryConfig<T>>[]): QueryConfig<T> {
        const merged: QueryConfig<T> = {};

        for (const query of queries) {
            if (query.select) {
                merged.select = { ...merged.select, ...query.select };
            }
            if (query.include) {
                merged.include = { ...merged.include, ...query.include };
            }
            if (query.where) {
                merged.where = merged.where
                    ? ({ AND: [merged.where, query.where] } as Where<T>)
                    : query.where;
            }
            if (query.orderBy) {
                if (merged.orderBy) {
                    const existingOrderBy = Array.isArray(merged.orderBy)
                        ? merged.orderBy
                        : [merged.orderBy];
                    const newOrderBy = Array.isArray(query.orderBy)
                        ? query.orderBy
                        : [query.orderBy];
                    merged.orderBy = [...existingOrderBy, ...newOrderBy];
                } else {
                    merged.orderBy = query.orderBy;
                }
            }
            if (query.take !== undefined) merged.take = query.take;
            if (query.skip !== undefined) merged.skip = query.skip;
            if (query.distinct) merged.distinct = query.distinct;
            if (query.cursor) merged.cursor = query.cursor;
        }

        return merged;
    }
}

/**
 * Helper class for building where conditions with type safety
 */
class WhereBuilder<T> {
    private conditions: Where<T> = {};

    equals<K extends keyof T>(field: K, value: T[K]): this {
        (this.conditions as any)[field] = { equals: value };
        return this;
    }

    in<K extends keyof T>(field: K, values: T[K][]): this {
        (this.conditions as any)[field] = { in: values };
        return this;
    }

    contains<K extends keyof T>(field: K, value: T[K] extends string ? string : never): this {
        (this.conditions as any)[field] = { contains: value };
        return this;
    }

    startsWith<K extends keyof T>(field: K, value: T[K] extends string ? string : never): this {
        (this.conditions as any)[field] = { startsWith: value };
        return this;
    }

    gt<K extends keyof T>(field: K, value: T[K]): this {
        (this.conditions as any)[field] = { gt: value };
        return this;
    }

    gte<K extends keyof T>(field: K, value: T[K]): this {
        (this.conditions as any)[field] = { gte: value };
        return this;
    }

    lt<K extends keyof T>(field: K, value: T[K]): this {
        (this.conditions as any)[field] = { lt: value };
        return this;
    }

    lte<K extends keyof T>(field: K, value: T[K]): this {
        (this.conditions as any)[field] = { lte: value };
        return this;
    }

    and(condition: Where<T>): this {
        if (this.conditions.AND) {
            this.conditions.AND.push(condition);
        } else {
            this.conditions.AND = [condition];
        }
        return this;
    }

    or(condition: Where<T>): this {
        if (this.conditions.OR) {
            this.conditions.OR.push(condition);
        } else {
            this.conditions.OR = [condition];
        }
        return this;
    }

    not(condition: Where<T>): this {
        this.conditions.NOT = condition;
        return this;
    }

    build(): Where<T> {
        return this.conditions;
    }
}

export { WhereBuilder };
