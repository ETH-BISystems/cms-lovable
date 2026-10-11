import { createFileRoute } from "@tanstack/react-router";
import { SEOPage } from "@/modules/seo";

export const Route = createFileRoute("/_app/seo/")({
  head: () => ({ meta: [{ title: "SEO — ETH Operations" }] }),
  component: SEOPage,
});
