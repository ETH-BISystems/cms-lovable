import { createFileRoute } from "@tanstack/react-router";
import { TrafficInsightsPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/traffic")({
  head: () => ({ meta: [{ title: "Traffic Insights — ETH Operations" }] }),
  component: TrafficInsightsPage,
});
