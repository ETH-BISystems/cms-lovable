import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/modules/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — ETH Operations" }],
  }),
  component: LoginPage,
});
