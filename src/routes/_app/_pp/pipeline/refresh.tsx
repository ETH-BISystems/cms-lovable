import { createFileRoute } from "@tanstack/react-router";
import { RefreshQueuePage } from "@/modules/pipeline";

export const Route = createFileRoute("/_app/_pp/pipeline/refresh")({
  head: () => ({ meta: [{ title: "Refresh Queue — ETH Operations" }] }),
  component: RefreshQueuePage,
});
