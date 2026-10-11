import { createFileRoute } from "@tanstack/react-router";
import { DomainOverviewPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/domain-overview")({
  head: () => ({ meta: [{ title: "Domain Overview — ETH Operations" }] }),
  component: DomainOverviewPage,
});
