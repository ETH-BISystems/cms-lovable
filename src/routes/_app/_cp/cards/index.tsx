import { createFileRoute } from "@tanstack/react-router";
import { CardsPage } from "@/modules/cards";

export const Route = createFileRoute("/_app/_cp/cards/")({
  head: () => ({ meta: [{ title: "Card Data Manager — ETH Operations" }] }),
  component: CardsPage,
});
