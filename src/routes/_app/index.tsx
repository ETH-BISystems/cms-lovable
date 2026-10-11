import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/modules/dashboard";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [{ title: "Dashboard — ETH Operations" }],
  }),
  component: DashboardPage,
});
