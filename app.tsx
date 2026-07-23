import { createFileRoute } from "@tanstack/react-router";
import { DashboardApp } from "@/components/DashboardApp";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — Market Intelligence Suite" },
      { name: "description", content: "Competitor analysis, SaaS audit, pricing and ROI calculators." },
    ],
  }),
  component: DashboardApp,
});
