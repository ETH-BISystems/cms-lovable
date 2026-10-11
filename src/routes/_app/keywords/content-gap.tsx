import { createFileRoute } from "@tanstack/react-router";
import { ContentGapPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/content-gap")({
  head: () => ({ meta: [{ title: "Content Gap — ETH Operations" }] }),
  component: ContentGapPage,
});
