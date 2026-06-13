export type Package = {
  id: string;
  package_id: string;
  name: string;
  publisher: string;
  description: string;
  description_full: string | null;
  version: string;
  installer_type: string | null;
  categories: string[];
  tags: string[];
  icon_url: string | null;
  moniker: string | null;
  homepage: string | null;
  publisher_url: string | null;
  publisher_support_url: string | null;
  license: string | null;
  release_date: string | null;
  popularity: number;
  is_featured: boolean;
};

export type PackageSummary = Pick<
  Package,
  "id" | "package_id" | "name" | "publisher" | "version" | "categories" | "installer_type"
>;

export type PackageSort = "relevance" | "name" | "recent";

export type LicenseGroup = "open-source" | "proprietary" | "unknown";

export type RecentRange = "month" | "quarter" | "year";

export type PackageFilters = {
  categories?: string[];
  publisher?: string;
  licenseGroup?: LicenseGroup;
  recent?: RecentRange;
  installer_type?: string;
  sort?: PackageSort;
};

export type FacetCount = {
  value: string;
  count: number;
};

export type PackageFacets = {
  categories: FacetCount[];
  licenseGroups: FacetCount[];
};

export type SearchPackagesResult = {
  data: Package[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
