import { createFileRoute } from "@tanstack/react-router";
import { RecommendationDetailPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/intelligence/$recommendationId")({
  head: () => ({ meta: [{ title: "Recommendation — ETH Operations" }] }),
  component: RecommendationDetailPage,
});
