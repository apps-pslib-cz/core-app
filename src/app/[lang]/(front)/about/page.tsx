import { Container, Stack, Title, Text } from "@mantine/core";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const cs = lang !== "en";

  return (
    <Container py="xl">
      <Stack gap="md">
        <Title order={1}>{cs ? "O aplikaci" : "About"}</Title>
        <Text c="dimmed">
          {cs
            ? "Zástupná stránka ze šablony core-app - nahraďte vlastním obsahem."
            : "Placeholder page from the core-app template - replace with your own content."}
        </Text>
      </Stack>
    </Container>
  );
}
