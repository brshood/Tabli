export function buildPaginationMeta(total, page, limit) {
    return {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    };
}
export async function paginateModel(model, filter, { page, limit, sort, select }) {
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
        items: items,
        pagination: buildPaginationMeta(total, page, limit),
    };
}
