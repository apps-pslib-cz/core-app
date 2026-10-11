"use client";

import React from "react";
import { Container, Group, Text, Anchor, Box, Stack } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import OrganisationLogo from "./OrganisationLogo";
import { useParams } from "next/navigation";

interface AppFooterProps {
  className?: string;
  style?: React.CSSProperties;
}

const AppFooter: React.FC<AppFooterProps> = ({ className, style }) => {
  const params = useParams();
  const currentLang = (params?.lang as string) || "cs";
  const isMobile = useMediaQuery("(max-width: 768px)");

  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";

  const footerLinks =
    currentLang === "cs"
      ? [
          { label: "O aplikaci", href: `/${currentLang}/about` },
          { label: "Nápověda", href: `/${currentLang}/help` },
          { label: "Kontakt", href: `/${currentLang}/contact` },
          { label: "Zásady ochrany údajů", href: `/${currentLang}/privacy` },
        ]
      : [
          { label: "About", href: `/${currentLang}/about` },
          { label: "Help", href: `/${currentLang}/help` },
          { label: "Contact", href: `/${currentLang}/contact` },
          { label: "Privacy Policy", href: `/${currentLang}/privacy` },
        ];

  return (
    <Box
      component="footer"
      className={className}
      bg="var(--mantine-color-body)"
      style={{
        borderTop: "1px solid var(--mantine-color-default-border)",
        padding: "var(--mantine-spacing-sm) 0",
        marginTop: "auto",
        ...style,
      }}
    >
      <Container size="xl">
        {isMobile ? (
          <Stack gap="sm" align="center">
            <OrganisationLogo width={80} height={15} />
            <Group gap="md" justify="center">
              {footerLinks.map((link) => (
                <Anchor key={link.href} href={link.href} size="xs" c="dimmed">
                  {link.label}
                </Anchor>
              ))}
            </Group>
            <Text size="xs" c="dimmed">
              v{appVersion}
            </Text>
          </Stack>
        ) : (
          <Group justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              v{appVersion}
            </Text>
            <Group gap="lg">
              {footerLinks.map((link) => (
                <Anchor key={link.href} href={link.href} size="sm" c="dimmed">
                  {link.label}
                </Anchor>
              ))}
            </Group>
            <OrganisationLogo width={110} height={20} />
          </Group>
        )}
      </Container>
    </Box>
  );
};

export default AppFooter;
