import { PackageGridSkeleton } from "@/components/store/package-grid-skeleton";

export default function StoreLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <PackageGridSkeleton count={12} />
    </div>
  );
}
