import { createFileRoute } from "@tanstack/react-router";
import { MarketOverviewPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/traffic-market/market-overview")({
  head: () => ({ meta: [{ title: "Market Overview — ETH Operations" }] }),
  component: MarketOverviewPage,
});
