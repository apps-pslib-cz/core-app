import { useContext } from "react";
import { SettingsDrawerContext } from "@/components/SettingsDrawer";

/**
 * Hook for accessing the global settings drawer state
 * Must be used within a SettingsDrawerProvider
 */
export function useSettingsDrawer() {
  const context = useContext(SettingsDrawerContext);
  if (!context) {
    throw new Error(
      "useSettingsDrawer must be used within a SettingsDrawerProvider",
    );
  }
  return context;
}
