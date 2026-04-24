import { Prisma } from "@prisma/client";
import { BaseQueryDto } from "../dto/query.dto";

export type ModelWhereInput = Record<string, any>;
export type ModelIncludeInput = Record<string, boolean | object>;

/** Define a generic type for the combined query options */
export interface QueryOptions<
    WhereInput extends ModelWhereInput,
    IncludeInput extends ModelIncludeInput,
> {
    where?: WhereInput;
    skip?: number;
    take?: number;
    orderBy?: Prisma.SortOrder | Prisma.Enumerable<Prisma.SortOrder>;
    include: IncludeInput;
}

/** Base types for Prisma-like operations */
export type Primitive = string | number | boolean | Date | null | undefined;

export type OrderDirection = "asc" | "desc";

/** Generic select type */
export type Select<T> = {
    [K in keyof T]?: T[K] extends Primitive
        ? boolean
        : T[K] extends (infer U)[]
          ? boolean | Select<U>
          : boolean | Select<T[K]>;
};

/** Generic where type with common operators */
export type WhereOperators<T> = T extends Primitive
    ? {
          equals?: T;
          not?: T | WhereOperators<T>;
          in?: T[];
          notIn?: T[];
          lt?: T;
          lte?: T;
          gt?: T;
          gte?: T;
          contains?: T extends string ? T : never;
          startsWith?: T extends string ? T : never;
          endsWith?: T extends string ? T : never;
          mode?: T extends string ? "default" | "insensitive" : never;
      }
    : T extends (infer U)[]
      ? {
            some?: Where<U>;
            every?: Where<U>;
            none?: Where<U>;
        }
      : Where<T>;

export type Where<T> = {
    [K in keyof T]?: WhereOperators<T[K]>;
} & {
    AND?: Where<T>[];
    OR?: Where<T>[];
    NOT?: Where<T>;
};

/** Generic orderBy type */
export type OrderBy<T> = {
    [K in keyof T]?: T[K] extends Primitive
        ? OrderDirection
        : T[K] extends (infer U)[]
          ? OrderBy<U>
          : OrderDirection | OrderBy<T[K]>;
};

/** Include type with full nested support */
export type Include<T> = {
    [K in keyof T]?: T[K] extends Primitive
        ? never
        : T[K] extends (infer U)[]
          ? boolean | IncludeConfig<U>
          : boolean | IncludeConfig<T[K]>;
};

export interface IncludeConfig<T> {
    select?: Select<T>;
    include?: Include<T>;
    where?: Where<T>;
    orderBy?: OrderBy<T> | OrderBy<T>[];
    take?: number;
    skip?: number;
    distinct?: (keyof T)[];
}

/** Main query configuration type */
export interface QueryConfig<T> {
    select?: Select<T>;
    include?: Include<T>;
    where?: Where<T>;
    orderBy?: OrderBy<T> | OrderBy<T>[];
    take?: number;
    skip?: number;
    distinct?: (keyof T)[];
    cursor?: { [K in keyof T]?: T[K] };
}

/** DTO types for input */
export type QueryDto<T> = BaseQueryDto & {
    select?: Select<T>;
    include?: Include<T>;
    where?: Where<T>;
    orderBy?: OrderBy<T> | OrderBy<T>[];
    distinct?: (keyof T)[];
    cursor?: { [K in keyof T]?: T[K] };
};
