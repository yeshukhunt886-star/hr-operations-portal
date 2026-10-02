import { config } from "../config.js";

export function parsePagination(query) {
  const page = Math.max(1, Number(query.page || 1) || 1);
  let pageSize = Number(query.pageSize || config.pageSizeDefault) || config.pageSizeDefault;
  if (pageSize < 1) pageSize = config.pageSizeDefault;
  if (pageSize > config.pageSizeMax) pageSize = config.pageSizeMax;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated(items, total, page, pageSize) {
  return { items, total, page, pageSize, pages: Math.ceil(total / pageSize) || 0 };
}
