import { createFileRoute, redirect } from "@tanstack/react-router";

// Team & HR moved into the Owner dashboard as a tab. Keep this URL alive as a
// redirect so old bookmarks, links and shared URLs still land in the right place.
export const Route = createFileRoute("/team")({
  beforeLoad: () => {
    throw redirect({ to: "/admin", search: { tab: "team" } });
  },
});
