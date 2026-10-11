import { createFileRoute } from "@tanstack/react-router";
import { TopPagesPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/top-pages")({
  head: () => ({ meta: [{ title: "Top Pages — ETH Operations" }] }),
  component: TopPagesPage,
});
