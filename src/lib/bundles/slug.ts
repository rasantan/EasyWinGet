import { randomBytes } from "crypto";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function generateBundleSlug(name: string): string {
  const base = slugify(name) || "bundle";
  const suffix = randomBytes(3).toString("hex");
  return `${base}-${suffix}`;
}
