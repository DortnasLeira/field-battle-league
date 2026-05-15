import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "PeladaPro — Buscar" }],
  }),
  component: () => <Navigate to="/buscar" replace />,
});
