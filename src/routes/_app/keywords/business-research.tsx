import { createFileRoute } from "@tanstack/react-router";
import { BusinessResearchPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/business-research")({
  head: () => ({ meta: [{ title: "Business Research — ETH Operations" }] }),
  component: BusinessResearchPage,
});
