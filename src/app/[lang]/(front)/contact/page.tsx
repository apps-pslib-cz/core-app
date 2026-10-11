import { Container, Stack, Title, Text } from "@mantine/core";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const cs = lang !== "en";

  return (
    <Container py="xl">
      <Stack gap="md">
        <Title order={1}>{cs ? "Kontakt" : "Contact"}</Title>
        <Text c="dimmed">
          {cs
            ? "Zástupná stránka ze šablony core-app - nahraďte vlastním kontaktem."
            : "Placeholder page from the core-app template - replace with your own contact details."}
        </Text>
      </Stack>
    </Container>
  );
}
