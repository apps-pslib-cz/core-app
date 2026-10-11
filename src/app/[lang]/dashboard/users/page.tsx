"use client";

import { Box, Button, Title, Group } from "@mantine/core";
import { IconPlus, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserTable } from "./UserTable";
import { DeleteUserModal } from "@/components/modals/DeleteUserModal";
import { UserListDto } from "@/types/dtos/users";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { useDictionary } from "@/hooks/useDictionary";
import { usePageTitle } from "@/hooks/usePageTitle";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import { RoleChecker } from "@/types/roles";
import { useDeleteUser, useSyncAvatars, useSyncActive } from "@/hooks/queries/users";

const UsersPage = () => {
  const router = useRouter();
  const { dictionary } = useDictionary();
  const { data: session } = useSession();

  // Set page title
  usePageTitle(dictionary?.pages?.users?.list || "Uživatelé");

  const userRoles = { roles: session?.user?.roles ?? [] };
  const isAdmin = RoleChecker.hasRole(userRoles, "admin");
  const [selectedUser, setSelectedUser] = useState<UserListDto | null>(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const tableRefreshRef = useRef<(() => void) | null>(null);
  const deleteUser = useDeleteUser();
  const syncAvatars = useSyncAvatars();
  const syncActive = useSyncActive();

  const handleEdit = (user: UserListDto) => {
    router.push(`/dashboard/users/${user.id}/edit`);
  };

  const handleView = (user: UserListDto) => {
    router.push(`/dashboard/users/${user.id}`);
  };

  const handleDelete = (user: UserListDto) => {
    setSelectedUser(user);
    setDeleteModalOpened(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;

    deleteUser.mutate(selectedUser.id, {
      onSuccess: () => {
        notifications.show({
          title: dictionary?.users?.messages?.success || "Success",
          message:
            dictionary?.users?.messages?.userDeleted ||
            `User ${selectedUser.name || selectedUser.email || "User"} was deleted successfully`,
          color: "green",
          icon: <IconCheck size={16} />,
        });

        tableRefreshRef.current?.();
        router.refresh();
      },
      onError: (error) => {
        notifications.show({
          title:
            dictionary?.users?.messages?.error ||
            dictionary?.common?.error ||
            "Error",
          message:
            error instanceof Error
              ? error.message
              : dictionary?.users?.messages?.deleteError ||
                "Failed to delete user",
          color: "red",
          icon: <IconX size={16} />,
        });
      },
      onSettled: () => {
        setDeleteModalOpened(false);
        setSelectedUser(null);
      },
    });
  };

  const handleSyncAvatars = () => {
    notifications.show({
      id: "sync-avatars",
      title: dictionary?.users?.messages?.avatarsSyncing || "Syncing avatars...",
      message: "",
      loading: true,
      autoClose: false,
    });

    syncAvatars.mutate(undefined, {
      onSuccess: (result) => {
        const summary = (
          dictionary?.users?.messages?.avatarsSyncedSummary ||
          "Updated {updated} of {total}, {failed} failed"
        )
          .replace("{updated}", String(result.updated))
          .replace("{total}", String(result.total))
          .replace("{failed}", String(result.failed.length));

        notifications.update({
          id: "sync-avatars",
          title: dictionary?.users?.messages?.avatarsSynced || "Avatar sync finished",
          message: summary,
          color: result.failed.length > 0 ? "yellow" : "green",
          icon: <IconCheck size={16} />,
          loading: false,
          autoClose: 6000,
        });

        tableRefreshRef.current?.();
      },
      onError: () => {
        notifications.update({
          id: "sync-avatars",
          title: dictionary?.common?.error || "Error",
          message:
            dictionary?.users?.messages?.avatarsSyncError ||
            "Failed to start avatar sync",
          color: "red",
          icon: <IconX size={16} />,
          loading: false,
          autoClose: 6000,
        });
      },
    });
  };

  const handleSyncActive = () => {
    notifications.show({
      id: "sync-active",
      title: dictionary?.users?.messages?.activeSyncing || "Checking active status...",
      message: "",
      loading: true,
      autoClose: false,
    });

    syncActive.mutate(undefined, {
      onSuccess: (result) => {
        const summary = (
          dictionary?.users?.messages?.activeSyncedSummary ||
          "Deactivated {deactivated} of {total}, {failed} failed"
        )
          .replace("{deactivated}", String(result.deactivated))
          .replace("{total}", String(result.total))
          .replace("{failed}", String(result.failed.length));

        notifications.update({
          id: "sync-active",
          title: dictionary?.users?.messages?.activeSynced || "Active status check finished",
          message: summary,
          color: result.failed.length > 0 ? "yellow" : "green",
          icon: <IconCheck size={16} />,
          loading: false,
          autoClose: 6000,
        });

        tableRefreshRef.current?.();
      },
      onError: () => {
        notifications.update({
          id: "sync-active",
          title: dictionary?.common?.error || "Error",
          message:
            dictionary?.users?.messages?.activeSyncError ||
            "Failed to start active status check",
          color: "red",
          icon: <IconX size={16} />,
          loading: false,
          autoClose: 6000,
        });
      },
    });
  };

  const breadcrumbItems = [
    { title: dictionary?.pages?.dashboard || "Dashboard", href: "/dashboard" },
    {
      title: dictionary?.pages?.users?.list || "Users",
      href: "/dashboard/users",
    },
  ];

  return (
    <Box>
      <AppBreadcrumbs items={breadcrumbItems} />

      <Box
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <Title order={1}>{dictionary?.pages?.users?.list || "Users"}</Title>

        <Group gap="xs">
          {isAdmin && (
            <>
              <Button
                onClick={handleSyncAvatars}
                loading={syncAvatars.isPending}
                leftSection={<IconRefresh size={16} />}
                variant="light"
              >
                {dictionary?.users?.actions?.syncAvatars || "Sync Avatars"}
              </Button>
              <Button
                onClick={handleSyncActive}
                loading={syncActive.isPending}
                leftSection={<IconRefresh size={16} />}
                variant="light"
              >
                {dictionary?.users?.actions?.syncActive || "Check Active Status"}
              </Button>
              <Button
                component={Link}
                href="/dashboard/users/create"
                leftSection={<IconPlus size={16} />}
                variant="filled"
              >
                {dictionary?.users?.actions?.newRecord || "Create User"}
              </Button>
            </>
          )}
        </Group>
      </Box>

      <UserTable
        onEdit={handleEdit}
        onView={handleView}
        onDelete={isAdmin ? handleDelete : undefined}
        onMountRefresh={(refresh) => {
          tableRefreshRef.current = refresh;
        }}
      />

      <DeleteUserModal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        onConfirm={handleDeleteConfirm}
        user={selectedUser}
        loading={deleteUser.isPending}
      />
    </Box>
  );
};

export default UsersPage;
