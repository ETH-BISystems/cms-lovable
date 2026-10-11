import { createFileRoute } from "@tanstack/react-router";
import { AiVisibilityPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/ai-visibility")({
  head: () => ({ meta: [{ title: "AI Visibility — ETH Operations" }] }),
  component: AiVisibilityPage,
});
