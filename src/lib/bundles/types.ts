import type { Package } from "@/lib/packages/types";

export type BundleItem = {
  bundle_id: string;
  package_id: string;
  sort_order: number;
  packages: Package | null;
};

export type Bundle = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string;
  is_public: boolean;
  locale: string;
  created_at: string;
  updated_at: string;
  bundle_items: BundleItem[];
};

export type DownloadHistoryEntry = {
  id: string;
  user_id: string;
  bundle_id: string | null;
  package_ids: string[];
  script_hash: string;
  created_at: string;
  bundles: { name: string } | null;
};
