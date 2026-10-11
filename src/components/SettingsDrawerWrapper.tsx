"use client";

import { SettingsDrawer } from "./SettingsDrawer";
import { useSettingsDrawer } from "@/hooks/useSettingsDrawer";

export function SettingsDrawerWrapper() {
  const { opened, close } = useSettingsDrawer();

  return <SettingsDrawer opened={opened} onClose={close} />;
}
