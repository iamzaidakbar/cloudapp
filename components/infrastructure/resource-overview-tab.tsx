import { Badge } from "@/components/ui/badge";

export function ResourceOverviewTab({ tags }: { tags: Record<string, string> }) {
  const tagEntries = Object.entries(tags);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Tags</h2>
        <p className="text-xs text-muted-foreground">
          Key/value metadata attached to this resource
        </p>
      </div>

      {tagEntries.length === 0 ? (
        <div className="border border-dashed border-border px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No tags on this resource.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2">
          {tagEntries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 bg-card px-3 py-2.5"
            >
              <Badge
                variant="outline"
                className="normal-case tracking-normal font-mono text-[11px]"
              >
                {key}
              </Badge>
              <code className="truncate font-mono text-xs text-muted-foreground">
                {value}
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
