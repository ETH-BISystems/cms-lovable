import { createFileRoute } from "@tanstack/react-router";
import { IframeManagerPage } from "@/modules/iframes";

export const Route = createFileRoute("/_app/iframes")({
  head: () => ({ meta: [{ title: "iFrame Manager — ETH Operations" }] }),
  component: IframeManagerPage,
});
