import { createFileRoute } from "@tanstack/react-router";
import { MyTasksPage } from "@/modules/my-tasks";

export const Route = createFileRoute("/_app/my-tasks")({
  head: () => ({ meta: [{ title: "My Tasks — ETH Operations" }] }),
  component: MyTasksPage,
});
