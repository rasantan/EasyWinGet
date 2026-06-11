import { Skeleton } from "@/components/ui/skeleton";

export default function PackageDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <Skeleton className="mb-6 h-11 w-24" />
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-8 h-24 w-full" />
      <Skeleton className="mt-6 h-11 w-40" />
    </div>
  );
}
