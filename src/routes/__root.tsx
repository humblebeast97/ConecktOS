import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { StoreProvider } from "../lib/store";
import { AuthProvider } from "../lib/auth";
import { AuthGate } from "../components/auth-gate";
import { IndustryProvider } from "../config/industry-context";
import { Toaster } from "../components/ui/sonner";
import { RouteProgress } from "../components/route-progress";
import { InstallPrompt } from "../components/install-prompt";

// Social scrapers need an absolute og:image. Set VITE_SITE_URL at deploy time
// (e.g. https://app.conecktos.com); falls back to a relative path locally.
const SITE_URL = (import.meta.env["VITE_SITE_URL"] ?? "").replace(/\/$/, "");
const OG_IMAGE = SITE_URL ? `${SITE_URL}/og.png` : "/og.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "ConecktOS. Service Business Operating System" },
      {
        name: "description",
        content:
          "ConecktOS runs service businesses: geofenced clock-ins, commission splits, inventory and daily audits.",
      },
      // theme-color per scheme so the browser chrome / iOS status bar match.
      { name: "theme-color", content: "#D9C7F0", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#15121F", media: "(prefers-color-scheme: dark)" },
      { name: "color-scheme", content: "light dark" },
      // Stop iOS from turning every 4-digit-looking string into a call link.
      { name: "format-detection", content: "telephone=no,email=no,address=no" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "ConecktOS" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:site_name", content: "ConecktOS" },
      { property: "og:type", content: "website" },
      ...(SITE_URL ? [{ property: "og:url", content: SITE_URL } as const] : []),
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "ConecktOS. Service Business Operating System." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "ConecktOS. Service Business Operating System." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// Apply the theme before first paint. Default is light: new visitors get
// light without touching localStorage. Explicit "dark" sticks. Explicit
// "system" clears the attribute so prefers-color-scheme takes over.
const THEME_BOOT = `(function(){try{var t=localStorage.getItem('conecktos-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}else if(t!=='system'){document.documentElement.setAttribute('data-theme','light');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

// Decide the landing redirect BEFORE the body paints, so returning users and
// the installed app never see the marketing page flash. The client-side effect
// in routes/index.tsx runs only after first paint (too late on a hard load);
// this blocking <head> script beats the paint. Only acts on "/", so SEO
// crawlers and signed-out browser visitors still get the full landing.
const ENTRY_BOOT = `(function(){try{if(location.pathname!=='/')return;var hasToken=false;try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.slice(-11)==='-auth-token'){hasToken=true;break;}}}catch(e){}var standalone=false;try{standalone=(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||window.navigator.standalone===true;}catch(e){}if(hasToken){location.replace('/admin');}else if(standalone){location.replace('/login');}}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: ENTRY_BOOT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Register the PWA service worker (production only) so the app is installable
  // and works offline. Dev is skipped to avoid stale-cache surprises while coding.
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    // When a new service worker version takes control (e.g. after a deploy that
    // bumped the cache version), reload once so the installed app drops the old
    // cached bundle and runs the fresh build instead of a stale one.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <AuthProvider>
          <IndustryProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
            >
              Skip to main content
            </a>
            <RouteProgress />
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <AuthGate>
              <Outlet />
            </AuthGate>
            <InstallPrompt />
            <Toaster position="top-center" />
          </IndustryProvider>
        </AuthProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}
