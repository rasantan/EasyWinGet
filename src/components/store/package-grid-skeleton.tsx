import { Skeleton } from "@/components/ui/skeleton";

export function PackageGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy
      aria-label="Loading packages"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
