import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ResourceOverviewTab({ tags }: { tags: Record<string, string> }) {
  const tagEntries = Object.entries(tags);

  return (
    <div className="flex flex-col gap-4 pt-4">
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {tagEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags on this resource.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tagEntries.map(([key, value]) => (
                <Badge key={key} variant="outline" className="font-mono text-xs">
                  {key}:{value}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
