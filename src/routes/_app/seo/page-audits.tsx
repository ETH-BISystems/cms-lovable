import { createFileRoute } from "@tanstack/react-router";
import { PageAuditsPage } from "@/modules/seo";

export const Route = createFileRoute("/_app/seo/page-audits")({
  head: () => ({ meta: [{ title: "Page Audits — ETH Operations" }] }),
  component: PageAuditsPage,
});
