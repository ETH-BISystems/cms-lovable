import { createFileRoute } from "@tanstack/react-router";
import { KeywordTrendsPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/trends")({
  head: () => ({ meta: [{ title: "Keyword Trends — ETH Operations" }] }),
  component: KeywordTrendsPage,
});
