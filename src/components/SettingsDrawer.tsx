"use client";

import React, { useState, createContext } from "react";
import {
  Drawer,
  Stack,
  Title,
  Divider,
  Group,
  Text,
  Button,
  Box,
  SegmentedControl,
} from "@mantine/core";
import {
  IconSettings,
  IconLanguage,
  IconPalette,
  IconTable,
  IconRefresh,
  IconLogin,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import {
  useSettings,
  type Language,
  type ColorScheme,
} from "@/providers/SettingsProvider";
import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { uiConfig } from "@/libs/ui-config";
import { notifications } from "@mantine/notifications";
import { useDictionary } from "@/hooks/useDictionary";

interface SettingsDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ opened, onClose }: SettingsDrawerProps) {
  const {
    settings,
    updateLanguage,
    updateColorScheme,
    updateTableRows,
    resetSettings,
  } = useSettings();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { dictionary, loading } = useDictionary();

  // Zobrazit loading pokud se načítá slovník
  if (loading || !dictionary) {
    return (
      <Drawer
        opened={opened}
        onClose={onClose}
        title="Loading..."
        position="right"
        size="md"
        padding="lg"
      >
        <Text>Loading...</Text>
      </Drawer>
    );
  }

  const t = dictionary.settings.drawer;
  const tAuth = dictionary.auth;

  // The URL segment is what's actually being rendered - reflect that here
  // rather than the stored preference, so the control can't show a language
  // that isn't the one currently on screen (e.g. after following a link
  // instead of using this switcher).
  const pathLocale = pathname.split("/")[1];
  const currentLanguage: Language =
    pathLocale === "en" ? "en" : pathLocale === "cs" ? "cs" : settings.language;

  const handleLanguageChange = (newLanguage: Language) => {
    updateLanguage(newLanguage);

    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${newLanguage}`);
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${newPath}?${queryString}` : newPath;

    router.push(fullPath);

    notifications.show({
      title: t.notifications.languageChanged.title,
      message:
        newLanguage === "cs"
          ? t.notifications.languageChanged.messageCzech
          : t.notifications.languageChanged.messageEnglish,
      color: "blue",
      autoClose: 3000,
    });
  };

  const handleColorSchemeChange = (newScheme: ColorScheme) => {
    updateColorScheme(newScheme);

    const messages = {
      auto: t.notifications.colorSchemeChanged.messageAuto,
      light: t.notifications.colorSchemeChanged.messageLight,
      dark: t.notifications.colorSchemeChanged.messageDark,
    };

    notifications.show({
      title: t.notifications.colorSchemeChanged.title,
      message: messages[newScheme],
      color: "blue",
      autoClose: 3000,
    });
  };

  const handleTableRowsChange = (newRows: number) => {
    updateTableRows(newRows);

    notifications.show({
      title: t.notifications.tableRowsChanged.title,
      message: `${t.notifications.tableRowsChanged.message} ${newRows}`,
      color: "blue",
      autoClose: 3000,
    });
  };

  const handleResetSettings = () => {
    resetSettings();

    notifications.show({
      title: t.notifications.settingsReset.title,
      message: t.notifications.settingsReset.message,
      color: "orange",
      autoClose: 4000,
    });
  };

  const handleSignIn = () => {
    signIn("duende-identity-server6");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconSettings size={20} />
          <Title order={4}>{t.title}</Title>
        </Group>
      }
      position="right"
      size="md"
      padding="lg"
      overlayProps={{ backgroundOpacity: 0.5, blur: 2 }}
    >
      <Stack gap="lg">
        {/* Jazyk aplikace */}
        <Box>
          <Group gap="xs" mb="sm">
            <IconLanguage size={18} />
            <Title order={5}>{t.language.title}</Title>
          </Group>
          <SegmentedControl
            fullWidth
            value={currentLanguage}
            onChange={(value) => handleLanguageChange(value as Language)}
            data={[
              { label: t.language.czech, value: "cs" },
              { label: t.language.english, value: "en" },
            ]}
          />
        </Box>

        <Divider />

        {/* Barevné schéma */}
        <Box>
          <Group gap="xs" mb="sm">
            <IconPalette size={18} />
            <Title order={5}>{t.colorScheme.title}</Title>
          </Group>
          <SegmentedControl
            fullWidth
            value={settings.colorScheme}
            onChange={(value) => handleColorSchemeChange(value as ColorScheme)}
            data={[
              { label: t.colorScheme.auto, value: "auto" },
              { label: t.colorScheme.light, value: "light" },
              { label: t.colorScheme.dark, value: "dark" },
            ]}
          />
        </Box>

        <Divider />

        {/* Počet řádků v tabulkách */}
        <Box>
          <Group gap="xs" mb="sm">
            <IconTable size={18} />
            <Title order={5}>{t.tableRows.title}</Title>
          </Group>
          <Group gap="xs">
            {uiConfig.tableRows.options.map((rows) => (
              <Button
                key={rows}
                variant={
                  settings.tableRowsPerPage === rows ? "filled" : "default"
                }
                size="sm"
                onClick={() => handleTableRowsChange(rows)}
              >
                {rows}
              </Button>
            ))}
          </Group>
        </Box>

        <Divider />

        {/* Přihlášení / Odhlášení */}
        <Box>
          <Group gap="xs" mb="sm">
            <IconUser size={18} />
            <Title order={5}>{t.userAccount.title}</Title>
          </Group>

          {session ? (
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                {t.userAccount.loggedInAs}:{" "}
                <strong>{session.user?.email}</strong>
              </Text>
              <Button
                variant="default"
                leftSection={<IconLogout size={16} />}
                onClick={handleSignOut}
                fullWidth
              >
                {tAuth.signOut}
              </Button>
            </Stack>
          ) : (
            <Button
              variant="default"
              leftSection={<IconLogin size={16} />}
              onClick={handleSignIn}
              fullWidth
            >
              {tAuth.signIn}
            </Button>
          )}
        </Box>

        <Divider />

        {/* Akce */}
        <Group justify="space-between">
          <Button
            variant="light"
            color="orange"
            leftSection={<IconRefresh size={16} />}
            onClick={handleResetSettings}
          >
            {t.actions.resetToDefaults}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}

// Context pro globální stav draweru
export const SettingsDrawerContext = createContext<{
  opened: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
} | null>(null);

// Provider pro globální stav
export function SettingsDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);

  const value = {
    opened,
    open: () => setOpened(true),
    close: () => setOpened(false),
    toggle: () => setOpened(!opened),
  };

  return (
    <SettingsDrawerContext.Provider value={value}>
      {children}
    </SettingsDrawerContext.Provider>
  );
}
