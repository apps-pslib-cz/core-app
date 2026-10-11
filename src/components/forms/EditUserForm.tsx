"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Paper,
  Title,
  TextInput,
  Checkbox,
  Button,
  Group,
  Stack,
  Alert,
  Loader,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX, IconAlertCircle } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import type { UpdateUserDto } from "@/types/dtos/users";
import { useDictionary } from "@/hooks/useDictionary";
import { APP_ROLES, RoleChecker } from "@/types/roles";
import { useUser, useUpdateUser } from "@/hooks/queries/users";

interface EditUserFormProps {
  userId: string;
}

interface EditUserFormValues {
  email: string;
  sub: string;
  name: string;
  givenName: string;
  middleName: string;
  familyName: string;
  roles: Record<string, boolean>;
  allowAutoUpdate: boolean;
  notifyByEmail: boolean;
  notifyByTeams: boolean;
  sendActionNotifications: boolean;
  isTestAccount: boolean;
  active: boolean;
  entraId: string;
  teamsUserId: string;
}

export function EditUserForm({ userId }: EditUserFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { dictionary } = useDictionary();
  const { data: user, isPending: initialLoading, error: loadError } = useUser(userId);
  const updateUser = useUpdateUser(userId);
  const formPopulatedRef = useRef<string | null>(null);

  // Check if current user is admin
  const isAdmin = RoleChecker.hasRole({ roles: session?.user?.roles ?? [] }, "admin");
  const isOwnProfile = session?.user?.id === userId;

  const form = useForm<EditUserFormValues>({
    initialValues: {
      email: "",
      sub: "",
      name: "",
      givenName: "",
      middleName: "",
      familyName: "",
      roles: Object.fromEntries(APP_ROLES.map((role) => [role, false])),
      allowAutoUpdate: true,
      notifyByEmail: true,
      notifyByTeams: false,
      sendActionNotifications: true,
      isTestAccount: false,
      active: true,
      entraId: "",
      teamsUserId: "",
    },
    validate: {
      email: (value: string | undefined) => {
        if (!value)
          return (
            dictionary?.users?.form?.validation?.emailRequired ||
            "Email is required"
          );
        if (!/^\S+@\S+\.\S+$/.test(value))
          return (
            dictionary?.users?.form?.validation?.emailInvalid ||
            "Invalid email format"
          );
        return null;
      },
      // Blank is legitimate here - sub fills in automatically on the
      // person's first OAuth login, so most not-yet-logged-in users won't
      // have one yet. Requiring it here would block editing anything else
      // about them until they log in once, which isn't a real constraint.
      givenName: (value: string | undefined) => {
        if (!value || value.trim().length === 0)
          return (
            dictionary?.users?.form?.validation?.givenNameRequired ||
            "Given name is required"
          );
        return null;
      },
      familyName: (value: string | undefined) => {
        if (!value || value.trim().length === 0)
          return (
            dictionary?.users?.form?.validation?.familyNameRequired ||
            "Family name is required"
          );
        return null;
      },
    },
  });

  // Naplní formulář, jakmile dorazí data z useUser - jen jednou za userId,
  // aby pozdější refetch na pozadí (React Query, staleTime) nepřepsal
  // rozepsané úpravy.
  useEffect(() => {
    if (!user || formPopulatedRef.current === userId) return;
    formPopulatedRef.current = userId;

    form.setValues({
      email: user.email || "",
      sub: user.sub || "",
      name: user.name || "",
      givenName: user.givenName || "",
      middleName: user.middleName || "",
      familyName: user.familyName || "",
      roles: Object.fromEntries(
        APP_ROLES.map((role) => [role, user.roles.includes(role)]),
      ),
      allowAutoUpdate: user.allowAutoUpdate ?? true,
      notifyByEmail: user.notifyByEmail ?? true,
      notifyByTeams: user.notifyByTeams ?? false,
      sendActionNotifications: user.sendActionNotifications ?? true,
      isTestAccount: user.isTestAccount ?? false,
      active: user.active ?? true,
      entraId: user.entraId || "",
      teamsUserId: user.teamsUserId || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form je stabilní z useForm, nepatří do deps
  }, [user, userId]);

  const handleSubmit = (values: EditUserFormValues) => {
    const payload: UpdateUserDto = {
      ...values,
      roles: Object.entries(values.roles)
        .filter(([, enabled]) => enabled)
        .map(([role]) => role),
    };

    updateUser.mutate(payload, {
      onSuccess: () => {
        notifications.show({
          title: dictionary?.users?.messages?.success || "Success",
          message:
            dictionary?.users?.messages?.userUpdated ||
            "User has been successfully updated",
          color: "green",
          icon: <IconCheck size="1rem" />,
        });
        router.back();
      },
      onError: (err) => {
        notifications.show({
          title: dictionary?.users?.messages?.error || "Error",
          message:
            err instanceof Error
              ? err.message
              : dictionary?.users?.messages?.updateError ||
                "An error occurred while updating user",
          color: "red",
          icon: <IconX size="1rem" />,
        });
      },
    });
  };

  if (initialLoading) {
    return (
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Stack align="center" py="xl">
          <Loader size="lg" />
          <Text>{dictionary?.common?.loading || "Loading..."}</Text>
        </Stack>
      </Paper>
    );
  }

  if (loadError) {
    return (
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title={dictionary?.users?.messages?.error || "Error"}
          color="red"
          variant="light"
        >
          {loadError instanceof Error
            ? loadError.message
            : dictionary?.users?.messages?.loadError ||
              "An error occurred while loading user details"}
        </Alert>
        <Group justify="center" mt="md">
          <Button variant="light" onClick={() => router.back()}>
            {dictionary?.common?.back || "Back"}
          </Button>
        </Group>
      </Paper>
    );
  }

  if (!user) {
    return null;
  }

  const hasAnyRole = Object.values(form.values.roles).some(Boolean);

  return (
    <Paper withBorder shadow="md" p="xl" radius="md">
      <Title order={2} mb="lg">
        {dictionary?.users?.edit || "Edit User"}
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              required
              label={dictionary?.users?.fields?.givenName || "First Name"}
              placeholder={dictionary?.users?.fields?.givenName || "First Name"}
              {...form.getInputProps("givenName")}
            />
            <TextInput
              label={dictionary?.users?.fields?.middleName || "Middle Name"}
              placeholder={
                dictionary?.users?.fields?.middleName || "Middle Name"
              }
              {...form.getInputProps("middleName")}
            />
          </Group>

          <TextInput
            required
            label={dictionary?.users?.fields?.familyName || "Last Name"}
            placeholder={dictionary?.users?.fields?.familyName || "Last Name"}
            {...form.getInputProps("familyName")}
          />

          <TextInput
            label={dictionary?.users?.fields?.name || "Display Name"}
            placeholder={dictionary?.users?.fields?.name || "Display Name"}
            description="Pokud není vyplněno, použije se kombinace křestního a příjmení"
            {...form.getInputProps("name")}
          />

          <TextInput
            required
            label={dictionary?.users?.fields?.email || "Email"}
            placeholder="user@example.com"
            description={
              !isAdmin && isOwnProfile
                ? dictionary?.users?.form?.emailSelfEditHint ||
                  "E-mail spravuje OAuth server, může ho změnit jen administrátor"
                : undefined
            }
            disabled={!isAdmin}
            {...form.getInputProps("email")}
          />

          <TextInput
            label={dictionary?.users?.fields?.sub || "OAuth Subject ID"}
            placeholder="Doplní se automaticky při prvním přihlášení"
            description="Unikátní identifikátor z OAuth serveru, podle kterého appka pozná uživatele při přihlášení - vyplní se sám při prvním přihlášení, není potřeba ho zadávat ručně. Může upravovat pouze admin."
            disabled={!isAdmin}
            {...form.getInputProps("sub")}
          />

          {isAdmin && (
            <>
              <Title order={4} mt="md">
                {dictionary?.users?.fields?.roles || "Roles"}
              </Title>

              <Stack gap="xs">
                {APP_ROLES.map((role) => (
                  <Checkbox
                    key={role}
                    label={
                      (dictionary?.users?.fields as Record<string, string> | undefined)?.[
                        role
                      ] || role
                    }
                    {...form.getInputProps(`roles.${role}`, { type: "checkbox" })}
                  />
                ))}
              </Stack>

              <Checkbox
                label="Povolit automatické aktualizace z OAuth serveru"
                description="Umožní automatické stahování a aktualizaci údajů z identity serveru"
                {...form.getInputProps("allowAutoUpdate", { type: "checkbox" })}
              />

              {!hasAnyRole && (
                <Alert color="orange" title="Upozornění">
                  Uživatel nemá přiřazenu žádnou roli. Nebude mít přístup k
                  žádným funkcím aplikace.
                </Alert>
              )}

              <Checkbox
                label="Testovací účet"
                description="Účet bez reálné e-mailové adresy, určený pro testery. Notifikace se pro něj nikdy neodesílají, bez ohledu na nastavení níže."
                checked={form.values.isTestAccount}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  form.setFieldValue("isTestAccount", checked);
                  if (checked) {
                    form.setFieldValue("notifyByEmail", false);
                    form.setFieldValue("notifyByTeams", false);
                  }
                }}
              />

              <Checkbox
                label="Aktivní"
                description="Neaktivní uživatelé se nenabízí ve výběrech, zůstávají ale v administraci a historických datech."
                {...form.getInputProps("active", { type: "checkbox" })}
              />

              <Title order={4} mt="md">
                Notifikace
              </Title>

              <Stack gap="xs">
                <Checkbox
                  label="Posílat notifikace e-mailem"
                  description="Uživatel bude dostávat notifikace na svůj e-mail"
                  disabled={form.values.isTestAccount}
                  {...form.getInputProps("notifyByEmail", { type: "checkbox" })}
                />
                <Checkbox
                  label="Posílat notifikace do Microsoft Teams"
                  description="Uživatel bude dostávat notifikace v Teams (vyžaduje nastavený Teams ID)"
                  disabled={form.values.isTestAccount}
                  {...form.getInputProps("notifyByTeams", { type: "checkbox" })}
                />
                <Checkbox
                  label="Upozorňovat ostatní na akce tohoto uživatele"
                  description="Když tento uživatel provede akci týkající se jiných uživatelů, appka o tom pošle e-mail zúčastněným"
                  {...form.getInputProps("sendActionNotifications", {
                    type: "checkbox",
                  })}
                />
              </Stack>

              <Title order={4} mt="md">
                Microsoft 365 Integration
              </Title>

              <TextInput
                label="Azure AD Object ID (Entra ID)"
                placeholder="00000000-0000-0000-0000-000000000000"
                description="Unikátní identifikátor uživatele v Azure Active Directory"
                {...form.getInputProps("entraId")}
              />

              <TextInput
                label="Microsoft Teams User ID"
                placeholder="teams-user-id"
                description="Unikátní identifikátor uživatele v Microsoft Teams"
                {...form.getInputProps("teamsUserId")}
              />
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => router.back()}
              disabled={updateUser.isPending}
            >
              {dictionary?.common?.cancel || "Cancel"}
            </Button>
            <Button type="submit" loading={updateUser.isPending}>
              {dictionary?.users?.form?.saveUser || "Save User"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}
