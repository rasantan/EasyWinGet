import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Code,
  Gamepad2,
  Globe,
  MessageCircle,
  Music,
  Package,
  Wrench,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "developer-tools": Code,
  utilities: Wrench,
  browsers: Globe,
  games: Gamepad2,
  social: MessageCircle,
  multimedia: Music,
  productivity: Briefcase,
};

export function getCategoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Package;
}

export function formatCategoryLabel(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
