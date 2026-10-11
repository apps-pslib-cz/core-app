"use client";

import { Group, Avatar, ActionIcon } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";
import { useSession } from "next-auth/react";
import { useSettingsDrawer } from "@/hooks/useSettingsDrawer";
import SignButton from "@/components/SignButton";
import UserAvatar from "@/components/UserAvatar";

interface UserSectionProps {
  variant?: "desktop" | "mobile";
  showAvatar?: boolean;
  showSignButton?: boolean;
}

export function UserSection({
  variant = "desktop",
  showAvatar = true,
  showSignButton = true,
}: UserSectionProps) {
  const { data: session, status } = useSession();
  const isAuth = status === "authenticated";
  const { toggle } = useSettingsDrawer();

  const handleSettingsOpen = () => {
    toggle();
  };

  if (variant === "mobile") {
    return (
      <Group gap="sm">
        {isAuth && showAvatar ? (
          <Avatar
            src={session?.user?.image}
            onClick={handleSettingsOpen}
            style={{ cursor: "pointer" }}
            size="sm"
          />
        ) : (
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleSettingsOpen}
            aria-label="Otevřít nastavení"
          >
            <IconSettings size={16} />
          </ActionIcon>
        )}
        {showSignButton && <SignButton variant="outline" size="sm" />}
      </Group>
    );
  }

  // Desktop variant
  return (
    <Group gap="sm">
      {isAuth && showAvatar ? (
        <UserAvatar
          picture={session?.user?.image}
          fullname={session?.user?.name}
          email={session?.user?.email}
          onClick={handleSettingsOpen}
        />
      ) : (
        <ActionIcon
          variant="subtle"
          size="md"
          onClick={handleSettingsOpen}
          aria-label="Otevřít nastavení"
        >
          <IconSettings size={20} />
        </ActionIcon>
      )}
      {showSignButton && <SignButton variant="outline" />}
    </Group>
  );
}

// Responzivní wrapper, který automaticky přepíná mezi desktop/mobile variantami
export function ResponsiveUserSection({
  mobileBreakpoint = "sm",
  ...props
}: UserSectionProps & { mobileBreakpoint?: string }) {
  const isMobile = useMediaQuery(`(max-width: ${mobileBreakpoint})`);

  return <UserSection {...props} variant={isMobile ? "mobile" : "desktop"} />;
}
