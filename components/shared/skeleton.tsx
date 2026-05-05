import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-text", className)} {...props} />;
}

function SkeletonHeading({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-heading", className)} {...props} />;
}

function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-card", className)} {...props} />;
}

function SkeletonCircle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-circle", className)} {...props} />;
}

function SkeletonAvatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-avatar", className)} {...props} />;
}

function SkeletonPage() {
  return (
    <div className="admin-page space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <SkeletonHeading />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="stagger-{i + 1}" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SkeletonCard className="h-64" />
        </div>
        <SkeletonCard className="h-64" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonHeading,
  SkeletonCard,
  SkeletonCircle,
  SkeletonAvatar,
  SkeletonPage,
};
