import { createFileRoute } from "@tanstack/react-router";
import { TrafficAnalyticsPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/traffic-market/")({
  head: () => ({ meta: [{ title: "Traffic Analytics — ETH Operations" }] }),
  component: TrafficAnalyticsPage,
});
