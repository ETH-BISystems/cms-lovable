import { createFileRoute } from "@tanstack/react-router";
import { ZernioCallbackPage } from "@/modules/experience";

export const Route = createFileRoute("/_app/zernio/callback")({
  head: () => ({ meta: [{ title: "Connecting Social Account — ETH Operations" }] }),
  component: ZernioCallbackPage,
});
