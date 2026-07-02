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
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center nb-border nb-shadow bg-[var(--c)] p-8">
        <h1 className="text-7xl font-black">404</h1>
        <h2 className="mt-4 text-xl font-black uppercase">Page Not Found</h2>
        <div className="mt-6">
          <Link to="/" className="nb-btn nb-btn-press bg-[var(--y)]">Go Home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center nb-border nb-shadow bg-[var(--p)] p-8">
        <h1 className="text-xl font-black uppercase">This page didn't load</h1>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="nb-btn nb-btn-press bg-[var(--y)]"
          >Try Again</button>
          <a href="/" className="nb-btn nb-btn-press bg-white">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Secure Medical Document Scanner" },
      { name: "description", content: "Client-side secure scanning of medical documents into PDFs. All processing happens in your browser." },
      { property: "og:title", content: "Secure Medical Document Scanner" },
      { name: "twitter:title", content: "Secure Medical Document Scanner" },
      { property: "og:description", content: "Client-side secure scanning of medical documents into PDFs. All processing happens in your browser." },
      { name: "twitter:description", content: "Client-side secure scanning of medical documents into PDFs. All processing happens in your browser." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/339165bd-b9d2-403e-9457-ec9cfae8c7bf/id-preview-02036f6e--3fa36dd2-1a26-4409-ad5f-418a831798f5.lovable.app-1781328812526.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/339165bd-b9d2-403e-9457-ec9cfae8c7bf/id-preview-02036f6e--3fa36dd2-1a26-4409-ad5f-418a831798f5.lovable.app-1781328812526.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
