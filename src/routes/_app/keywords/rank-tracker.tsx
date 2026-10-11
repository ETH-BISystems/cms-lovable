import { createFileRoute } from "@tanstack/react-router";
import { RankTrackerPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/rank-tracker")({
  head: () => ({ meta: [{ title: "Rank Tracker — ETH Operations" }] }),
  component: RankTrackerPage,
});
