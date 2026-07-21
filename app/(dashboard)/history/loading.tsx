export default function HistoryLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded-md" />
        <div className="h-4 w-80 bg-muted/60 rounded-md" />
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border bg-card/60 flex justify-between items-center h-20">
            <div className="space-y-2">
              <div className="h-5 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted/50 rounded" />
            </div>
            <div className="h-6 w-20 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
