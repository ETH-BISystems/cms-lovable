import { createFileRoute } from "@tanstack/react-router";
import { TrafficTopPagesPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/traffic-market/top-pages")({
  head: () => ({ meta: [{ title: "Traffic Top Pages — ETH Operations" }] }),
  component: TrafficTopPagesPage,
});
