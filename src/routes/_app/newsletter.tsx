import { createFileRoute } from "@tanstack/react-router";
import { NewsletterPage } from "@/modules/newsletter";

export const Route = createFileRoute("/_app/newsletter")({
  head: () => ({ meta: [{ title: "Newsletter Command Center — ETH Operations" }] }),
  component: NewsletterPage,
});
