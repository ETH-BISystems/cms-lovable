import { createFileRoute } from "@tanstack/react-router";
import { AiTrafficPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/traffic-market/ai-traffic")({
  head: () => ({ meta: [{ title: "AI Traffic — ETH Operations" }] }),
  component: AiTrafficPage,
});
