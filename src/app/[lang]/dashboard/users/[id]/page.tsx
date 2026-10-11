"use client";

import {
  Box,
  Text,
  Title,
  Paper,
  Group,
  Stack,
  Avatar,
  Badge,
  Divider,
  Button,
  Alert,
  LoadingOverlay,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconCalendar,
  IconUser,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconBell,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { notifications } from "@mantine/notifications";
import { DeleteUserModal } from "@/components/modals/DeleteUserModal";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { APP_ROLES, RoleChecker } from "@/types/roles";
import { useUser, useDeleteUser } from "@/hooks/queries/users";

const ROLE_BADGE_COLORS = ["red", "orange", "teal", "violet", "blue"];

const Page = () => {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { dictionary } = useDictionary();

  const userId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const { data: user, isPending, error } = useUser(userId);
  const deleteUser = useDeleteUser();

  // Set page title
  usePageTitle(user?.name || dictionary?.pages?.users?.detail || "Detail uživatele");

  // Check if current user can edit/delete this user
  const isAdmin = RoleChecker.hasRole({ roles: session?.user?.roles ?? [] }, "admin");
  const isOwnProfile = session?.user?.id === userId;
  const canEdit = isAdmin || isOwnProfile;
  const canDelete = isAdmin && !isOwnProfile; // Admins can delete others but not themselves

  const handleEdit = () => {
    router.push(`/dashboard/users/${userId}/edit`);
  };

  const handleDelete = () => {
    setDeleteModalOpened(true);
  };

  const confirmDelete = () => {
    if (!user) return;

    deleteUser.mutate(user.id, {
      onSuccess: () => {
        notifications.show({
          title: "Úspěch",
          message: "Uživatel byl úspěšně smazán",
          color: "green",
          icon: <IconCheck size="1rem" />,
        });
        router.push("/dashboard/users");
      },
      onError: (err) => {
        notifications.show({
          title: "Chyba",
          message: err instanceof Error ? err.message : "Při mazání uživatele došlo k chybě.",
          color: "red",
          icon: <IconX size="1rem" />,
        });
      },
      onSettled: () => {
        setDeleteModalOpened(false);
      },
    });
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpened(false);
  };

  if (isPending) {
    return (
      <Box pos="relative" h={300}>
        <LoadingOverlay visible />
      </Box>
    );
  }

  if (error || !user) {
    const breadcrumbItems = [
      {
        title: "Administration",
        href: "/dashboard",
        translationKey: "users.breadcrumbs.administration",
      },
      {
        title: "Users",
        href: "/dashboard/users",
        translationKey: "users.breadcrumbs.users",
      },
      { title: "Detail", translationKey: "users.breadcrumbs.detail" },
    ];

    return (
      <>
        <AppBreadcrumbs items={breadcrumbItems} />

        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title={dictionary?.users?.messages?.error || "Error"}
          color="red"
          variant="light"
        >
          {error instanceof Error ? error.message : "Uživatel nebyl nalezen."}
        </Alert>

        <Box mt="md">
          <Button component={Link} href="/dashboard/users" variant="light">
            {dictionary?.users?.actions?.backToList || "Back to Users List"}
          </Button>
        </Box>
      </>
    );
  }

  const breadcrumbItems = [
    {
      title: "Administration",
      href: "/dashboard",
      translationKey: "users.breadcrumbs.administration",
    },
    {
      title: "Users",
      href: "/dashboard/users",
      translationKey: "users.breadcrumbs.users",
    },
    { title: `${user.givenName} ${user.familyName}` },
  ];

  return (
    <>
      <AppBreadcrumbs items={breadcrumbItems} />

      <Group justify="space-between" mb="md">
        <Title order={2}>{dictionary?.users?.detail || "User Detail"}</Title>
        <Group>
          {canEdit && (
            <Button
              leftSection={<IconEdit size="1rem" />}
              onClick={handleEdit}
              variant="light"
            >
              {dictionary?.users?.actions?.editUser || "Edit"}
            </Button>
          )}
          {canDelete && (
            <Button
              leftSection={<IconTrash size="1rem" />}
              onClick={handleDelete}
              color="red"
              variant="light"
            >
              {dictionary?.users?.actions?.deleteUser || "Delete"}
            </Button>
          )}
        </Group>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-start" mb="md">
          <Avatar src={`/api/v1/users/${user.id}/avatar`} size="xl" radius="md">
            {`${user.givenName?.[0] || ""}${user.familyName?.[0] || ""}`}
          </Avatar>
          <Stack gap="xs" flex={1}>
            <Group>
              <Text size="xl" fw={500}>
                {user.name ||
                  `${user.givenName} ${user.middleName ? `${user.middleName} ` : ""}${user.familyName}`}
              </Text>
              {isOwnProfile && (
                <Badge color="blue" variant="light">
                  {dictionary?.users?.profile || "Your Profile"}
                </Badge>
              )}
              {user.isTestAccount && (
                <Badge color="orange" variant="filled">
                  Testovací účet
                </Badge>
              )}
            </Group>

            <Group gap="md">
              {APP_ROLES.map((role, index) => {
                const hasRole = user.roles.includes(role);
                const label =
                  (dictionary?.users?.fields as Record<string, string> | undefined)?.[
                    role
                  ] || role;
                return (
                  <Badge
                    key={role}
                    color={hasRole ? ROLE_BADGE_COLORS[index % ROLE_BADGE_COLORS.length] : "gray"}
                    variant={hasRole ? "filled" : "light"}
                  >
                    {label}:{" "}
                    {hasRole
                      ? dictionary?.users?.roleLabels?.yes || "Yes"
                      : dictionary?.users?.roleLabels?.no || "No"}
                  </Badge>
                );
              })}
            </Group>
          </Stack>
        </Group>

        <Divider my="md" />

        <Stack gap="md">
          <Group>
            <IconUser size="1rem" />
            <Text fw={500}>
              {dictionary?.users?.form?.personalInfo || "Personal Information"}:
            </Text>
          </Group>

          <Box pl="md">
            <Stack gap="xs">
              <Group>
                <Text w={120} c="dimmed">
                  {dictionary?.users?.fields?.givenName || "First Name"}:
                </Text>
                <Text>{user.givenName}</Text>
              </Group>
              {user.middleName && (
                <Group>
                  <Text w={120} c="dimmed">
                    {dictionary?.users?.fields?.middleName || "Middle Name"}:
                  </Text>
                  <Text>{user.middleName}</Text>
                </Group>
              )}
              <Group>
                <Text w={120} c="dimmed">
                  {dictionary?.users?.fields?.familyName || "Last Name"}:
                </Text>
                <Text>{user.familyName}</Text>
              </Group>
              {user.email && (
                <Group>
                  <Text w={120} c="dimmed">
                    {dictionary?.users?.fields?.email || "Email"}:
                  </Text>
                  <Text>{user.email}</Text>
                </Group>
              )}
              {user.sub && (
                <Group>
                  <Text w={120} c="dimmed">
                    {dictionary?.users?.fields?.sub || "OAuth ID"}:
                  </Text>
                  <Text ff="monospace" size="sm">
                    {user.sub}
                  </Text>
                </Group>
              )}
            </Stack>
          </Box>

          {(user.createdAt || user.updatedAt) && (
            <>
              <Divider />
              <Group>
                <IconCalendar size="1rem" />
                <Text fw={500}>
                  {dictionary?.users?.form?.timeInfo || "Time Information"}:
                </Text>
              </Group>

              <Box pl="md">
                <Stack gap="xs">
                  {user.createdAt && (
                    <Group>
                      <Text w={120} c="dimmed">
                        {dictionary?.users?.fields?.createdAt || "Created"}:
                      </Text>
                      <Text>
                        {new Date(user.createdAt).toLocaleString("cs-CZ")}
                      </Text>
                    </Group>
                  )}
                  {user.updatedAt && (
                    <Group>
                      <Text w={120} c="dimmed">
                        {dictionary?.users?.fields?.updatedAt || "Updated"}:
                      </Text>
                      <Text>
                        {new Date(user.updatedAt).toLocaleString("cs-CZ")}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {(user.notifyByEmail ||
            user.notifyByTeams ||
            user.entraId ||
            user.teamsUserId) && (
            <>
              <Divider />
              <Group>
                <IconBell size="1rem" />
                <Text fw={500}>Microsoft 365 Integration</Text>
              </Group>

              <Box pl="md">
                <Stack gap="xs">
                  <Group>
                    <Text w={140} c="dimmed">
                      Email notifications:
                    </Text>
                    <Badge
                      color={user.notifyByEmail ? "green" : "gray"}
                      variant="light"
                      leftSection={
                        user.notifyByEmail ? (
                          <IconCheck size={12} />
                        ) : (
                          <IconX size={12} />
                        )
                      }
                    >
                      {user.notifyByEmail ? "Enabled" : "Disabled"}
                    </Badge>
                  </Group>

                  <Group>
                    <Text w={140} c="dimmed">
                      Teams notifications:
                    </Text>
                    <Badge
                      color={user.notifyByTeams ? "green" : "gray"}
                      variant="light"
                      leftSection={
                        user.notifyByTeams ? (
                          <IconCheck size={12} />
                        ) : (
                          <IconX size={12} />
                        )
                      }
                    >
                      {user.notifyByTeams ? "Enabled" : "Disabled"}
                    </Badge>
                  </Group>

                  {user.entraId && (
                    <Group>
                      <Text w={140} c="dimmed">
                        Entra ID:
                      </Text>
                      <Text ff="monospace" size="sm">
                        {user.entraId}
                      </Text>
                    </Group>
                  )}

                  {user.teamsUserId && (
                    <Group>
                      <Text w={140} c="dimmed">
                        Teams User ID:
                      </Text>
                      <Text ff="monospace" size="sm">
                        {user.teamsUserId}
                      </Text>
                    </Group>
                  )}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Paper>

      {user && (
        <DeleteUserModal
          user={{
            id: user.id,
            sub: user.sub ?? null,
            email: user.email ?? null,
            image: user.image,
            name: user.name,
            givenName: user.givenName,
            middleName: user.middleName,
            familyName: user.familyName,
            roles: user.roles,
            isTestAccount: user.isTestAccount,
            active: user.active,
          }}
          opened={deleteModalOpened}
          onClose={handleCloseDeleteModal}
          onConfirm={confirmDelete}
          loading={deleteUser.isPending}
        />
      )}
    </>
  );
};

export default Page;
