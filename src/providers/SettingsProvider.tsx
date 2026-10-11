"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import {
  MantineProvider,
  createTheme,
  MantineColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { getDefaultLanguage, getDefaultTableRows } from "@/libs/ui-config";

// Převod naší ColorScheme na Mantine ColorScheme
function convertColorScheme(scheme: string): MantineColorScheme {
  switch (scheme) {
    case "light":
      return "light";
    case "dark":
      return "dark";
    case "auto":
    default:
      return "auto";
  }
}

function getResolvedColorScheme(scheme: ColorScheme): "light" | "dark" {
  if (scheme === "light" || scheme === "dark") {
    return scheme;
  }

  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return "light";
}

// Komponenta pro synchronizaci color scheme s Mantine
function MantineThemeSync({ colorScheme }: { colorScheme: ColorScheme }) {
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const mantineScheme = convertColorScheme(colorScheme);
    setColorScheme(mantineScheme);
  }, [colorScheme, setColorScheme]);

  return null;
}

// Typy pro nastavení
export type ColorScheme = "light" | "dark" | "auto";
export type Language = "cs" | "en";

export interface UserSettings {
  // Základní nastavení
  language: Language;
  colorScheme: ColorScheme;
  tableRowsPerPage: number;
}

// Výchozí nastavení - načte z environment variables
const defaultSettings: UserSettings = {
  language: getDefaultLanguage() as Language,
  colorScheme: "auto",
  tableRowsPerPage: getDefaultTableRows(),
};

// Load settings synchronously before first render
function getInitialSettings(): UserSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const saved = localStorage.getItem("user-settings");
    if (saved) {
      return { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn("Failed to parse saved settings:", error);
  }

  return defaultSettings;
}

// Akce pro reducer
export type SettingsAction =
  | { type: "SET_LANGUAGE"; payload: Language }
  | { type: "SET_COLOR_SCHEME"; payload: ColorScheme }
  | { type: "SET_TABLE_ROWS"; payload: number }
  | { type: "RESET_TO_DEFAULTS" }
  | { type: "LOAD_SETTINGS"; payload: Partial<UserSettings> };

// Reducer pro správu stavu
function settingsReducer(
  state: UserSettings,
  action: SettingsAction,
): UserSettings {
  switch (action.type) {
    case "SET_LANGUAGE":
      return { ...state, language: action.payload };

    case "SET_COLOR_SCHEME":
      return { ...state, colorScheme: action.payload };

    case "SET_TABLE_ROWS":
      return { ...state, tableRowsPerPage: action.payload };

    case "RESET_TO_DEFAULTS":
      return { ...defaultSettings };

    case "LOAD_SETTINGS":
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// Context interface
interface SettingsContextType {
  settings: UserSettings;
  dispatch: React.Dispatch<SettingsAction>;
  // Helper funkce pro pohodlné používání
  updateLanguage: (language: Language) => void;
  updateColorScheme: (scheme: ColorScheme) => void;
  updateTableRows: (rows: number) => void;
  resetSettings: () => void;
}

// Context
const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

// Hook pro přístup k nastavení
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Provider komponenta
interface SettingsProviderProps {
  children: ReactNode;
  initialSettings?: Partial<UserSettings>;
}

export function SettingsProvider({
  children,
  initialSettings,
}: SettingsProviderProps) {
  const [settings, dispatch] = useReducer(settingsReducer, {
    ...getInitialSettings(), // Load BEFORE first render
    ...initialSettings,
  });

  // Only save to localStorage when settings change (no load effect needed)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("user-settings", JSON.stringify(settings));

      const resolvedColorScheme = getResolvedColorScheme(settings.colorScheme);
      document.cookie =
        `mantine-color-scheme-value=${resolvedColorScheme}; Path=/; Max-Age=31536000; SameSite=Lax`;

      // Mirrors the color-scheme cookie above: lets src/proxy.ts honor an
      // explicit in-app language choice on future visits to an unprefixed
      // URL, instead of re-guessing from Accept-Language every time.
      document.cookie =
        `preferred-locale=${settings.language}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  }, [settings]);

  // Helper funkce
  const updateLanguage = (language: Language) => {
    dispatch({ type: "SET_LANGUAGE", payload: language });
  };

  const updateColorScheme = (scheme: ColorScheme) => {
    dispatch({ type: "SET_COLOR_SCHEME", payload: scheme });
  };

  const updateTableRows = (rows: number) => {
    dispatch({ type: "SET_TABLE_ROWS", payload: rows });
  };

  const resetSettings = () => {
    dispatch({ type: "RESET_TO_DEFAULTS" });
  };

  const contextValue: SettingsContextType = {
    settings,
    dispatch,
    updateLanguage,
    updateColorScheme,
    updateTableRows,
    resetSettings,
  };

  // Mantine theme
  const theme = createTheme({
    /** Put your mantine theme override here */
  });

  return (
    <SettingsContext.Provider value={contextValue}>
      <MantineProvider
        theme={theme}
        defaultColorScheme={convertColorScheme(settings.colorScheme)}
      >
        <MantineThemeSync colorScheme={settings.colorScheme} />
        {children}
      </MantineProvider>
    </SettingsContext.Provider>
  );
}
