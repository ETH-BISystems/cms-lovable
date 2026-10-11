import { createFileRoute } from "@tanstack/react-router";
import { TransferPartnersPage } from "@/modules/cards";

export const Route = createFileRoute("/_app/_cp/cards/transfer-partners")({
  head: () => ({ meta: [{ title: "Transfer Partners — ETH Operations" }] }),
  component: TransferPartnersPage,
});
