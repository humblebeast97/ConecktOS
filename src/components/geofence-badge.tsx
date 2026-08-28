import { Badge } from "@/components/ui/badge";

/**
 * Compact status pill for a staff member's clock-in geofence check.
 * "Absent" when no attendance, "Verified" inside the geofence, "Unverified"
 * when location was unavailable, "Flagged" when they clocked in off-site.
 */
export function GeofenceBadge({
  att,
}: {
  att?: { is_within_geofence: boolean; clock_in_lat: number | null };
}) {
  if (!att) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Absent
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={
        att.is_within_geofence
          ? "border-success/40 text-success"
          : att.clock_in_lat === null
            ? "border-warning/40 text-warning"
            : "border-destructive/40 text-destructive"
      }
    >
      {att.is_within_geofence ? "Verified" : att.clock_in_lat === null ? "Unverified" : "Flagged"}
    </Badge>
  );
}
