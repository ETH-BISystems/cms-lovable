import { createFileRoute } from "@tanstack/react-router";
import { PipelinePage } from "@/modules/pipeline";

export const Route = createFileRoute("/_app/_pp/pipeline/")({
  head: () => ({ meta: [{ title: "Article Pipeline — ETH Operations" }] }),
  component: PipelinePage,
});
