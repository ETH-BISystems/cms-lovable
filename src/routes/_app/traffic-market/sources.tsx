import { createFileRoute } from "@tanstack/react-router";
import { SourcesDestinationsPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/traffic-market/sources")({
  head: () => ({ meta: [{ title: "Sources & Destinations — ETH Operations" }] }),
  component: SourcesDestinationsPage,
});
