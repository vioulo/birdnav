import { defaultOptions } from "@/lib/options";

export function buildOptionsFeedbackHref(type: "success" | "error", message: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(type, message);
  return `/admin/options?${searchParams.toString()}`;
}

export function buildCurrentOptions(storedOptions: Record<string, string>) {
  return {
    "site.title":
      storedOptions["site.title"] || defaultOptions["site.title"],
    "site.subtitle":
      storedOptions["site.subtitle"] || defaultOptions["site.subtitle"],
    "site.description":
      storedOptions["site.description"] || defaultOptions["site.description"],
    "site.keywords":
      storedOptions["site.keywords"] || defaultOptions["site.keywords"],
    "site.url":
      storedOptions["site.url"] || defaultOptions["site.url"],
    "site.og_image":
      storedOptions["site.og_image"] || defaultOptions["site.og_image"],
    "ui.radius":
      storedOptions["ui.radius"] || defaultOptions["ui.radius"],
    "site.click_behavior":
      storedOptions["site.click_behavior"] || defaultOptions["site.click_behavior"],
    "home.page_size":
      storedOptions["home.page_size"] || defaultOptions["home.page_size"],
    "home.featured_limit":
      storedOptions["home.featured_limit"] || defaultOptions["home.featured_limit"],
    "footer.copyright":
      storedOptions["footer.copyright"] || defaultOptions["footer.copyright"],
    "footer.links":
      storedOptions["footer.links"] || defaultOptions["footer.links"],
  };
}
