export default function CalendarLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-56 bg-muted rounded-md" />
        <div className="h-4 w-96 bg-muted/60 rounded-md" />
      </div>

      <div className="rounded-xl border bg-card/60 p-4 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-36 bg-muted rounded" />
          <div className="h-7 w-48 bg-muted rounded" />
        </div>

        <div className="grid grid-cols-7 gap-1 h-96 pt-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="border rounded-md bg-muted/20 p-2" />
          ))}
        </div>
      </div>
    </div>
  )
}
