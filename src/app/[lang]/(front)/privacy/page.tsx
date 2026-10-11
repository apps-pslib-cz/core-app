import { Container, Stack, Title, Text } from "@mantine/core";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const cs = lang !== "en";

  return (
    <Container py="xl">
      <Stack gap="md">
        <Title order={1}>
          {cs ? "Zásady ochrany údajů" : "Privacy Policy"}
        </Title>
        <Text c="dimmed">
          {cs
            ? "Zástupná stránka ze šablony core-app - nahraďte skutečnými zásadami ochrany údajů pro konkrétní appku."
            : "Placeholder page from the core-app template - replace with the actual privacy policy for your app."}
        </Text>
      </Stack>
    </Container>
  );
}
