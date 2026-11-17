import { createFileRoute } from "@tanstack/react-router";
import { SlotGame } from "@/game/SlotGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hubie's Gold Rush — 7x7 Cluster Pays Demo" },
      { name: "description", content: "Play the Hubie's Gold Rush demo: 7x7 cluster pays, tumbling wins and growing multiplier spots." },
      { property: "og:title", content: "Hubie's Gold Rush — 7x7 Cluster Pays Demo" },
      { property: "og:description", content: "Tumbling cluster wins and multiplier spots with Hubie the sloth." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SlotGame,
});
