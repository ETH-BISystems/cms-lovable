import { createFileRoute } from "@tanstack/react-router";
import { SerpAnalysisPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/serp")({
  head: () => ({ meta: [{ title: "SERP Analysis — ETH Operations" }] }),
  component: SerpAnalysisPage,
});
