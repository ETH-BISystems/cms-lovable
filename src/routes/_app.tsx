import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/modules/auth";
import { AppLayout } from "@/shell";

/**
 * Authenticated app shell — mirrors the production App.tsx nesting:
 * ProtectedRoute → AppLayout (AppLayout renders the <Outlet /> for all
 * child routes). AuthProvider/TooltipProvider/Toaster live in __root.
 */
export const Route = createFileRoute("/_app")({
  component: AppShell,
});

function AppShell() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}
