import { createFileRoute } from "@tanstack/react-router";
import { BacklinksPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/backlinks")({
  head: () => ({ meta: [{ title: "Backlink Analytics — ETH Operations" }] }),
  component: BacklinksPage,
});
