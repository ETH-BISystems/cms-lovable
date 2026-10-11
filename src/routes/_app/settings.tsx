import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/modules/settings";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — ETH Operations" }] }),
  component: SettingsPage,
});
