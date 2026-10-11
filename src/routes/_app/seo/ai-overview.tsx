import { createFileRoute } from "@tanstack/react-router";
import { AIOverviewTrackerPage } from "@/modules/seo";

export const Route = createFileRoute("/_app/seo/ai-overview")({
  head: () => ({ meta: [{ title: "AI Overview Tracker — ETH Operations" }] }),
  component: AIOverviewTrackerPage,
});
