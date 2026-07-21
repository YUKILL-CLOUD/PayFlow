export default function PlannerLoading() {
  return (
    <div className="p-4 md:p-6 space-y-8 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-64 bg-muted rounded-md" />
        <div className="h-4 w-96 bg-muted/60 rounded-md" />
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border bg-card/60 space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-28 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted/50 rounded" />
          </div>
        ))}
      </div>

      {/* Widgets Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card/60 p-5 space-y-4 h-64">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-10 bg-muted/40 rounded" />
            <div className="h-10 bg-muted/40 rounded" />
            <div className="h-10 bg-muted/40 rounded" />
          </div>
        </div>

        <div className="rounded-xl border bg-card/60 p-5 space-y-4 h-64">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-10 bg-muted/40 rounded" />
            <div className="h-10 bg-muted/40 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}
