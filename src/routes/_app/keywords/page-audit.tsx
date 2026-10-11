import { createFileRoute } from "@tanstack/react-router";
import { PageAuditPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/page-audit")({
  head: () => ({ meta: [{ title: "Page Audit — ETH Operations" }] }),
  component: PageAuditPage,
});
