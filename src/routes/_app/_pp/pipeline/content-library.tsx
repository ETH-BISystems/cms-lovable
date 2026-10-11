import { createFileRoute } from "@tanstack/react-router";
import { ContentLibraryPage } from "@/modules/pipeline";

export const Route = createFileRoute("/_app/_pp/pipeline/content-library")({
  head: () => ({ meta: [{ title: "Content Library — ETH Operations" }] }),
  component: ContentLibraryPage,
});
