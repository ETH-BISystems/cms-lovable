import { createFileRoute } from "@tanstack/react-router";
import { TransferPartnerTablesPage } from "@/modules/transfer-partners";

export const Route = createFileRoute("/_app/transfer-partners")({
  head: () => ({ meta: [{ title: "Transfer Partner Tables — ETH Operations" }] }),
  component: TransferPartnerTablesPage,
});
