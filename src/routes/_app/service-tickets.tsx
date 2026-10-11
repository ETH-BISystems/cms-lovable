import { createFileRoute } from "@tanstack/react-router";
import { ServiceTicketsPage } from "@/modules/service-tickets";

export const Route = createFileRoute("/_app/service-tickets")({
  head: () => ({ meta: [{ title: "Service Tickets — ETH Operations" }] }),
  component: ServiceTicketsPage,
});
