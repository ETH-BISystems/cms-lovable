import { createFileRoute } from "@tanstack/react-router";
import { OrganicResearchPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/organic-research")({
  head: () => ({ meta: [{ title: "Organic Research — ETH Operations" }] }),
  component: OrganicResearchPage,
});
