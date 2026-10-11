import { createFileRoute } from "@tanstack/react-router";
import { KeywordsPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/")({
  head: () => ({ meta: [{ title: "Keyword Research — ETH Operations" }] }),
  component: KeywordsPage,
});
