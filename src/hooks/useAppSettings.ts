import { useSettings } from "@/providers/SettingsProvider";

/**
 * Hook pro pohodlný přístup k aplikačním nastavením
 * Wrapper kolem useSettings s typovanými helpers
 */
export function useAppSettings() {
  const {
    settings,
    updateLanguage,
    updateColorScheme,
    updateTableRows,
    resetSettings,
  } = useSettings();

  return {
    // Přímý přístup k nastavením
    language: settings.language,
    colorScheme: settings.colorScheme,
    tableRowsPerPage: settings.tableRowsPerPage,

    // Helper funkce
    setLanguage: updateLanguage,
    setColorScheme: updateColorScheme,
    setTableRowsPerPage: updateTableRows,
    resetToDefaults: resetSettings,

    // Celý settings objekt pro pokročilé použití
    allSettings: settings,
  };
}
