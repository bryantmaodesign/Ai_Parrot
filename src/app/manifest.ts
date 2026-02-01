import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Japanese Shadowing",
    short_name: "Shadowing",
    description: "Shadow Japanese sentences with AI-generated cards and practice feedback.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      { src: "/next.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
