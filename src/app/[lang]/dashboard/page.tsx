import Link from "next/link";
import {
  Box,
  Breadcrumbs,
  Text,
  Title,
  SimpleGrid,
  Paper,
  Stack,
  Group,
  Badge,
  ThemeIcon,
} from "@mantine/core";
import { IconUsers, IconFileAnalytics } from "@tabler/icons-react";
import { type Metadata } from "next";
import {
  createMetadata,
  getLanguageFromParams,
  type MetadataParams,
} from "@/libs/metadata";
import { getDictionary, type Locale } from "@/app/[lang]/dictionaries";
import { prisma } from "@/libs/prisma";
import { APP_ROLES } from "@/types/roles";

export async function generateMetadata({
  params,
}: MetadataParams): Promise<Metadata> {
  const language = await getLanguageFromParams(params);
  const locale: Locale = language === "en" ? "en" : "cs";
  const dictionary = await getDictionary(locale);

  return createMetadata({
    title: dictionary.pages.dashboard,
    language,
  });
}

const ROLE_BADGE_COLORS = ["red", "blue", "teal", "violet", "orange"];

async function loadDashboardStats() {
  const [totalUsers, roleCounts] = await Promise.all([
    prisma.user.count(),
    Promise.all(
      APP_ROLES.map((role) => prisma.user.count({ where: { roles: { has: role } } })),
    ),
  ]);

  return {
    totalUsers,
    roleCounts: Object.fromEntries(
      APP_ROLES.map((role, index) => [role, roleCounts[index]]),
    ) as Record<string, number>,
  };
}

const Page = async ({
  params,
}: {
  params: Promise<{ lang: string }>;
}) => {
  const { lang } = await params;
  const locale: Locale = lang === "en" ? "en" : "cs";
  const dictionary = await getDictionary(locale);
  const stats = await loadDashboardStats();
  const roleLabels = dictionary?.users?.fields as Record<string, string> | undefined;

  // Zde doplňte další sekce admin menu (viz DashboardNavigation) - "logs" je
  // admin-only, takže ho appka ukáže i tady jen adminům díky requiredRole.
  const shortcuts = [
    {
      href: "/dashboard/users",
      label: dictionary?.dashboard?.menu?.users || "Uživatelé",
      icon: <IconUsers size={20} />,
    },
    {
      href: "/dashboard/logs",
      label: dictionary?.dashboard?.menu?.logs || "Logy",
      icon: <IconFileAnalytics size={20} />,
    },
  ];

  return (
    <Box>
      <Breadcrumbs separatorMargin="md" mb={10}>
        <Text>{dictionary.pages.dashboard}</Text>
      </Breadcrumbs>
      <Title order={2} mb="lg">
        {dictionary.pages.dashboard}
      </Title>

      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          <Paper withBorder p="md" radius="md">
            <Stack gap={4}>
              <Text size="sm" c="dimmed">
                {dictionary?.dashboard?.menu?.users || "Uživatelé"}
              </Text>
              <Text size="xl" fw={700}>
                {stats.totalUsers}
              </Text>
              <Group gap={4} wrap="wrap">
                {APP_ROLES.map((role, index) => (
                  <Badge
                    key={role}
                    size="sm"
                    color={ROLE_BADGE_COLORS[index % ROLE_BADGE_COLORS.length]}
                  >
                    {roleLabels?.[role] || role}: {stats.roleCounts[role]}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>
        </SimpleGrid>

        <div>
          <Title order={3} mb="sm">
            Rychlé odkazy
          </Title>
          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={`/${lang}${shortcut.href}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  style={{ cursor: "pointer" }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <ThemeIcon variant="light" size="lg">
                      {shortcut.icon}
                    </ThemeIcon>
                    <Text fw={500} size="sm">
                      {shortcut.label}
                    </Text>
                  </Group>
                </Paper>
              </Link>
            ))}
          </SimpleGrid>
        </div>
      </Stack>
    </Box>
  );
};

export default Page;
