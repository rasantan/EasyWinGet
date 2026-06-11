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
  icon_url: string | null;
  moniker: string | null;
};

export type PackageSummary = Pick<
  Package,
  "id" | "package_id" | "name" | "publisher" | "version" | "categories" | "installer_type"
>;

export type PackageFilters = {
  category?: string;
  publisher?: string;
  installer_type?: string;
};

export type SearchPackagesResult = {
  data: Package[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
