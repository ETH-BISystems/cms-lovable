import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CardsProvider } from "@/modules/cards";

/** CardsProvider wrapper for /cards routes (mirrors production App.tsx). */
export const Route = createFileRoute("/_app/_cp")({
  component: CardsLayout,
});

function CardsLayout() {
  return (
    <CardsProvider>
      <Outlet />
    </CardsProvider>
  );
}
