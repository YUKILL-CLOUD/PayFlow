export default function BillsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded-md" />
        <div className="h-4 w-80 bg-muted/60 rounded-md" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-5 rounded-xl border bg-card/60 space-y-3 h-40">
            <div className="flex justify-between">
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted/70 rounded-full" />
            </div>
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-3 w-40 bg-muted/50 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
