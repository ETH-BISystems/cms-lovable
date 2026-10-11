import { createFileRoute } from "@tanstack/react-router";
import { TrafficDistributionPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/traffic-market/distribution")({
  head: () => ({ meta: [{ title: "Traffic Distribution — ETH Operations" }] }),
  component: TrafficDistributionPage,
});
