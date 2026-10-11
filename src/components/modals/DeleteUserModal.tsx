"use client";

import { Modal, Text, Group, Button, Badge, Stack, Alert } from "@mantine/core";
import { IconAlertTriangle, IconUserX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import type { UserListDto } from "@/types/dtos/users";
import { useDictionary } from "@/hooks/useDictionary";
import { RoleChecker } from "@/types/roles";

interface DeleteUserModalProps {
  user: UserListDto | null;
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function DeleteUserModal({
  user,
  opened,
  onClose,
  onConfirm,
  loading = false,
}: DeleteUserModalProps) {
  const { data: session } = useSession();
  const { dictionary } = useDictionary();

  // Check if current user is admin
  const isAdmin = RoleChecker.hasRole({ roles: session?.user?.roles ?? [] }, "admin");

  // Check if trying to delete self
  const isDeletingSelf = session?.user?.id === user?.id;

  if (!user) return null;

  // Collect user roles for display
  const roleLabels = user.roles.map(
    (role) =>
      (dictionary?.users?.fields as Record<string, string> | undefined)?.[role] ||
      role,
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconUserX size="1.2rem" />
          <Text fw={600}>
            {dictionary?.users?.delete?.title || "Delete User"}
          </Text>
        </Group>
      }
      centered
    >
      <Stack gap="md">
        <Alert
          icon={<IconAlertTriangle size="1rem" />}
          title={dictionary?.users?.delete?.warning || "Warning"}
          color="red"
          variant="light"
        >
          <Text size="sm">
            {dictionary?.users?.delete?.irreversible ||
              "This action cannot be undone. The user will be permanently deleted."}
          </Text>
        </Alert>

        {isDeletingSelf && (
          <Alert
            icon={<IconAlertTriangle size="1rem" />}
            title={
              dictionary?.users?.delete?.warning || "Self-deletion warning"
            }
            color="orange"
            variant="light"
          >
            <Text size="sm">
              Chystáte se smazat svůj vlastní účet. Budete okamžitě odhlášeni.
            </Text>
          </Alert>
        )}

        <Stack gap="xs">
          <Text fw={500}>
            {dictionary?.users?.delete?.confirmText ||
              "Do you really want to delete user"}
            :
          </Text>
          <Text size="sm" c="dimmed">
            <strong>{dictionary?.users?.fields?.email || "Email"}:</strong>{" "}
            {user.email}
          </Text>
          <Text size="sm" c="dimmed">
            <strong>{dictionary?.users?.fields?.name || "Name"}:</strong>{" "}
            {user.givenName} {user.middleName ? `${user.middleName} ` : ""}
            {user.familyName}
          </Text>
          {roleLabels.length > 0 && (
            <Group gap="xs" align="center">
              <Text size="sm" c="dimmed" fw={500}>
                {dictionary?.users?.fields?.roles || "Roles"}:
              </Text>
              {roleLabels.map((role, index) => (
                <Badge key={index} size="sm" variant="light">
                  {role}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={onClose} disabled={loading}>
            {dictionary?.users?.delete?.cancel || "Cancel"}
          </Button>
          <Button
            color="red"
            onClick={onConfirm}
            loading={loading}
            disabled={!isAdmin || loading}
          >
            {dictionary?.users?.delete?.confirm || "Delete User"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
