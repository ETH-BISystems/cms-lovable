import { createFileRoute } from "@tanstack/react-router";
import { KeywordOverviewPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/overview")({
  head: () => ({ meta: [{ title: "Keyword Overview — ETH Operations" }] }),
  component: KeywordOverviewPage,
});
