import { Container, Stack, Title, Text } from "@mantine/core";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const cs = lang !== "en";

  return (
    <Container py="xl">
      <Stack gap="md">
        <Title order={1}>{cs ? "Nápověda" : "Help"}</Title>
        <Text c="dimmed">
          {cs
            ? "Zástupná stránka ze šablony core-app - nahraďte vlastním obsahem (návody, FAQ)."
            : "Placeholder page from the core-app template - replace with your own content (guides, FAQ)."}
        </Text>
      </Stack>
    </Container>
  );
}
