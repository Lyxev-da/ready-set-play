import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const GameShell = lazy(() => import("@/arcade/GameShell"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "One in a Zillion — Pixel Number Arcade" },
      { name: "description", content: "Roll a number, uncover stacking patterns, collect rare tiers, and play Standard or Hardcore in One in a Zillion." },
      { property: "og:title", content: "One in a Zillion — Pixel Number Arcade" },
      { property: "og:description", content: "Chase rare number patterns in the original pixel arcade, with Standard and Hardcore runs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Loading() {
  return <main className="arcade-loading" aria-busy="true"><h1>ONE IN A ZILLION</h1><p>OPENING THE ARCADE…</p></main>;
}

function Index() {
  return <ClientOnly fallback={<Loading />}><Suspense fallback={<Loading />}><GameShell /></Suspense></ClientOnly>;
}
