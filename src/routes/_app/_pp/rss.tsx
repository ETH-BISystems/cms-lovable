import { createFileRoute } from "@tanstack/react-router";
import { RSSPage } from "@/modules/rss-monitor";

export const Route = createFileRoute("/_app/_pp/rss")({
  head: () => ({ meta: [{ title: "RSS Feed Monitor — ETH Operations" }] }),
  component: RSSPage,
});
