import { createFileRoute } from "@tanstack/react-router";
import { ExperiencePage } from "@/modules/experience";

export const Route = createFileRoute("/_app/experience")({
  head: () => ({ meta: [{ title: "Experience Library — ETH Operations" }] }),
  component: ExperiencePage,
});
