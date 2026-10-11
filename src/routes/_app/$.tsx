import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/shell";

/**
 * Catch-all — mirrors the production `<Route path="*">`: any path without a
 * dedicated page renders the ComingSoonPage naming the feature from the URL.
 */
export const Route = createFileRoute("/_app/$")({
  component: ComingSoonPage,
});
