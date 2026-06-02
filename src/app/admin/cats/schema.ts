import type { Prisma } from "@prisma/client";

export const PAGE_SIZE = 20;

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  _count: {
    sites: number;
  };
};

export function buildCatsHref(page: number, keyword = "") {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (keyword) {
    searchParams.set("q", keyword);
  }

  const query = searchParams.toString();
  return query ? `/admin/cats?${query}` : "/admin/cats";
}

export function buildCatsModalHref(page: number, keyword = "") {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (keyword) {
    searchParams.set("q", keyword);
  }

  searchParams.set("modal", "new");
  return `/admin/cats?${searchParams.toString()}`;
}

export function buildCatsFeedbackHref(
  page: number,
  type: "success" | "error",
  message: string,
  modal?: "new",
  keyword = "",
) {
  const searchParams = new URLSearchParams();

  if (page > 1) {
    searchParams.set("page", String(page));
  }

  if (keyword) {
    searchParams.set("q", keyword);
  }

  if (modal) {
    searchParams.set("modal", modal);
  }

  searchParams.set(type, message);
  const query = searchParams.toString();

  return query ? `/admin/cats?${query}` : "/admin/cats";
}

export function buildCategoryWhere(keyword: string): Prisma.CategoryWhereInput {
  return keyword
    ? {
        OR: [
          { name: { contains: keyword } },
          { slug: { contains: keyword } },
          { color: { contains: keyword } },
        ],
      }
    : {};
}
