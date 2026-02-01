"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/contexts/SettingsContext";

export default function SettingsPage() {
  const router = useRouter();
  const { openSheet } = useSettings();

  useEffect(() => {
    openSheet();
    router.replace("/", { scroll: false });
  }, [openSheet, router]);

  return null;
}
