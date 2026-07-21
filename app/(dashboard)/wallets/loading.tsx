export default function WalletsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded-md" />
        <div className="h-4 w-80 bg-muted/60 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-5 rounded-xl border bg-card/60 space-y-3 h-36">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-muted rounded-xl" />
              <div className="h-5 w-32 bg-muted rounded" />
            </div>
            <div className="h-4 w-48 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
