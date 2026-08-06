import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Crossfade between screens on navigation via the View Transitions API.
    // Falls back to an instant swap where unsupported, and auto-respects
    // prefers-reduced-motion.
    defaultViewTransition: true,
  });

  return router;
};
