import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/modules/calendar";

export const Route = createFileRoute("/_app/_pp/calendar")({
  head: () => ({ meta: [{ title: "Editorial Calendar — ETH Operations" }] }),
  component: CalendarPage,
});
