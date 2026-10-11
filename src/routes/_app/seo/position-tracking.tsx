import { createFileRoute } from "@tanstack/react-router";
import { PositionTrackingPage } from "@/modules/seo";

export const Route = createFileRoute("/_app/seo/position-tracking")({
  head: () => ({ meta: [{ title: "Position Tracking — ETH Operations" }] }),
  component: PositionTrackingPage,
});
