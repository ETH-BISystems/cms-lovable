import { createFileRoute } from "@tanstack/react-router";
import { IntelligenceDashboard } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/intelligence/")({
  head: () => ({ meta: [{ title: "SEO Intelligence — ETH Operations" }] }),
  component: IntelligenceDashboard,
});
