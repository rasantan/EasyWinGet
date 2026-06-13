import type { LucideIcon } from "lucide-react";
import {
  Braces,
  Briefcase,
  Camera,
  Clapperboard,
  Cloud,
  Code,
  Cpu,
  FileText,
  FolderOpen,
  Gamepad2,
  Globe,
  GraduationCap,
  Mail,
  MessageCircle,
  Music,
  Network,
  Package,
  Palette,
  Shield,
  Terminal,
  Users,
  Video,
  Wrench,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "developer-tools": Code,
  "programming-languages": Braces,
  productivity: Briefcase,
  "office-documents": FileText,
  utilities: Wrench,
  "system-drivers": Cpu,
  "security-privacy": Shield,
  networking: Network,
  multimedia: Clapperboard,
  "audio-music": Music,
  video: Video,
  "graphics-design": Palette,
  photography: Camera,
  games: Gamepad2,
  browsers: Globe,
  communication: MessageCircle,
  social: Users,
  email: Mail,
  "cloud-storage": Cloud,
  "file-management": FolderOpen,
  education: GraduationCap,
  "terminal-shell": Terminal,
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
