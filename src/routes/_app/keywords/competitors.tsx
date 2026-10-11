import { createFileRoute } from "@tanstack/react-router";
import { CompetitorAnalysisPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/competitors")({
  head: () => ({ meta: [{ title: "Competitor Analysis — ETH Operations" }] }),
  component: CompetitorAnalysisPage,
});
