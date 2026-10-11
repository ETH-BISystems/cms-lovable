import { createFileRoute } from "@tanstack/react-router";
import { InternalLinksPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/internal-links")({
  head: () => ({ meta: [{ title: "Internal Links — ETH Operations" }] }),
  component: InternalLinksPage,
});
