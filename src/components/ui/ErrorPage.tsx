"use client";

import React from "react";
import {
  Title,
  Text,
  Button,
  Container,
  Group,
  Stack,
  ThemeIcon,
} from "@mantine/core";
import { IconHome, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useDictionary } from "@/hooks/useDictionary";
import styles from "./ErrorPage.module.css";

interface ErrorPageProps {
  icon: React.ReactNode;
  title: string;
  message: string;
  description?: string;
  statusCode?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  homeLabel?: string;
  retryLabel?: string;
}

export function ErrorPage({
  icon,
  title,
  message,
  description,
  statusCode,
  showRetry = false,
  onRetry,
  homeLabel,
  retryLabel,
}: ErrorPageProps) {
  const { dictionary } = useDictionary();

  return (
    <div className={styles.container}>
      <Container className={styles.inner}>
        <Stack align="center" gap="xl">
          {/* Error Code */}
          {statusCode && (
            <Text className={styles.statusCode}>{statusCode}</Text>
          )}

          {/* Icon */}
          <ThemeIcon
            size="xl"
            radius="xl"
            variant="light"
            color="red"
            className={styles.iconWrapper}
          >
            {icon}
          </ThemeIcon>

          {/* Title */}
          <Title order={1} className={styles.title}>
            {title}
          </Title>

          {/* Main Message */}
          <Text size="lg" c="dimmed" ta="center" className={styles.message}>
            {message}
          </Text>

          {/* Additional Description */}
          {description && (
            <Text
              size="sm"
              c="dimmed"
              ta="center"
              className={styles.description}
            >
              {description}
            </Text>
          )}

          {/* Action Buttons */}
          <Group gap="md" className={styles.actions}>
            {showRetry && onRetry && (
              <Button
                variant="outline"
                leftSection={<IconRefresh size="1rem" />}
                onClick={onRetry}
                size="md"
              >
                {retryLabel ||
                  dictionary?.errors?.serverError?.tryAgain ||
                  "Zkusit znovu"}
              </Button>
            )}

            <Button
              component={Link}
              href="/"
              leftSection={<IconHome size="1rem" />}
              size="md"
            >
              {homeLabel || dictionary?.common?.home || "Domů"}
            </Button>
          </Group>
        </Stack>
      </Container>
    </div>
  );
}
