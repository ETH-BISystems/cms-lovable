import { createFileRoute } from "@tanstack/react-router";
import { BrandMonitoringPage } from "@/modules/keywords";

export const Route = createFileRoute("/_app/keywords/brand-monitoring")({
  head: () => ({ meta: [{ title: "Brand Monitoring — ETH Operations" }] }),
  component: BrandMonitoringPage,
});
