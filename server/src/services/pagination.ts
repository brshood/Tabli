import type { Document, FilterQuery, Model, ProjectionType, SortOrder } from 'mongoose';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T = any> {
  items: T[];
  pagination: PaginationMeta;
}

interface PaginateOptions<T extends Document> {
  page: number;
  limit: number;
  sort?: Record<string, SortOrder>;
  select?: ProjectionType<T>;
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function paginateModel<T extends Document>(
  model: Model<T>,
  filter: FilterQuery<T>,
  { page, limit, sort, select }: PaginateOptions<T>
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * limit;
  let query = model.find(filter).skip(skip).limit(limit);

  if (sort) {
    query = query.sort(sort);
  }
  if (select) {
    query = query.select(select);
  }

  const [items, total] = await Promise.all([query, model.countDocuments(filter)]);

  return {
    items: items as T[],
    pagination: buildPaginationMeta(total, page, limit),
  };
}

