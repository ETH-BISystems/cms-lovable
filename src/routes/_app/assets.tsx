import { createFileRoute } from "@tanstack/react-router";
import { AssetsPage } from "@/modules/assets";

export const Route = createFileRoute("/_app/assets")({
  head: () => ({ meta: [{ title: "Asset Library — ETH Operations" }] }),
  component: AssetsPage,
});
