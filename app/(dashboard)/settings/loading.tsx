export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-40 bg-muted rounded-md" />
        <div className="h-4 w-96 bg-muted/60 rounded-md" />
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="p-6 rounded-xl border bg-card/60 space-y-4 h-48">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-10 bg-muted/40 rounded" />
            <div className="h-10 bg-muted/40 rounded" />
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card/60 space-y-4 h-64">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-10 bg-muted/40 rounded" />
          <div className="h-20 bg-muted/30 rounded" />
        </div>
      </div>
    </div>
  )
}
