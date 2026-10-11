"use client";

import { useSession } from "next-auth/react";
import { Container, Stack, Text, Title, Loader } from "@mantine/core";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <Container py="xl">
      {status === "loading" ? (
        <Loader />
      ) : (
        <Stack gap="md">
          <Title order={1}>core-app</Title>
          {session?.user ? (
            <>
              <Text>Přihlášen jako {session.user.name ?? session.user.email}</Text>
              <Text size="sm" c="dimmed">
                Role: {session.user.roles?.join(", ") || "žádné"}
              </Text>
            </>
          ) : (
            <Text c="dimmed">Nejste přihlášeni - použijte tlačítko v hlavičce.</Text>
          )}
        </Stack>
      )}
    </Container>
  );
}
