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
        {showSignButton && <SignButton variant="outline" size="sm" compact />}
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
      {showSignButton && <SignButton variant="outline" compact={false} />}
    </Group>
  );
}

// Responzivní wrapper, který automaticky přepíná mezi desktop/mobile variantami
export function ResponsiveUserSection({
  mobileBreakpoint = "sm",
  variant,
  ...props
}: UserSectionProps & { mobileBreakpoint?: string }) {
  // "sm" není platná CSS <length> - `(max-width: sm)` je neplatný media
  // query, který nikdy neplatí, takže se mobilní varianta (jen avatar)
  // nepoužila a jméno+e-mail na mobilu přetékaly přes obsah. Stejný převod
  // má SignButton.tsx.
  const breakpointPx = mobileBreakpoint === "sm" ? "768px" : mobileBreakpoint;
  const isMobile = useMediaQuery(`(max-width: ${breakpointPx})`);

  // `variant` zvenku (BaseLayout podle šířky obsahu, headerFit) má přednost.
  return <UserSection {...props} variant={variant ?? (isMobile ? "mobile" : "desktop")} />;
}
