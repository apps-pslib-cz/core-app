"use client";

import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Title,
  TextInput,
  Checkbox,
  Button,
  Group,
  Stack,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconX } from "@tabler/icons-react";
import type { CreateUserDto } from "@/types/dtos/users";
import { useDictionary } from "@/hooks/useDictionary";
import { APP_ROLES } from "@/types/roles";
import { useCreateUser } from "@/hooks/queries/users";

interface CreateUserFormValues {
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
  isTestAccount: boolean;
  active: boolean;
  entraId: string;
  teamsUserId: string;
}

export function CreateUserForm() {
  const router = useRouter();
  const { dictionary } = useDictionary();
  const createUser = useCreateUser();

  const form = useForm<CreateUserFormValues>({
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
      isTestAccount: false,
      active: true,
      entraId: "",
      teamsUserId: "",
    },
    validate: {
      email: (value: string) => {
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
      sub: (value: string) => {
        if (!value || value.trim().length === 0)
          return (
            dictionary?.users?.form?.validation?.subRequired ||
            "OAuth Subject ID is required"
          );
        return null;
      },
      givenName: (value: string) => {
        if (!value || value.trim().length === 0)
          return (
            dictionary?.users?.form?.validation?.givenNameRequired ||
            "Given name is required"
          );
        return null;
      },
      familyName: (value: string) => {
        if (!value || value.trim().length === 0)
          return (
            dictionary?.users?.form?.validation?.familyNameRequired ||
            "Family name is required"
          );
        return null;
      },
    },
  });

  const handleSubmit = (values: CreateUserFormValues) => {
    const payload: CreateUserDto = {
      ...values,
      roles: Object.entries(values.roles)
        .filter(([, enabled]) => enabled)
        .map(([role]) => role),
    };

    createUser.mutate(payload, {
      onSuccess: () => {
        notifications.show({
          title: dictionary?.users?.messages?.success || "Success",
          message:
            dictionary?.users?.messages?.userCreated ||
            "User has been successfully created",
          color: "green",
          icon: <IconCheck size="1rem" />,
        });
        router.back();
      },
      onError: (error) => {
        notifications.show({
          title: dictionary?.users?.messages?.error || "Error",
          message:
            error instanceof Error
              ? error.message
              : dictionary?.users?.messages?.createError ||
                "An error occurred while creating user",
          color: "red",
          icon: <IconX size="1rem" />,
        });
      },
    });
  };

  const hasAnyRole = Object.values(form.values.roles).some(Boolean);

  return (
    <Container size="md" py="xl">
      <Paper withBorder shadow="md" p="xl" radius="md">
        <Title order={2} mb="lg">
          {dictionary?.users?.create || "New User"}
        </Title>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <Group grow>
              <TextInput
                required
                label={dictionary?.users?.fields?.givenName || "First Name"}
                placeholder={
                  dictionary?.users?.fields?.givenName || "First Name"
                }
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
              {...form.getInputProps("email")}
            />

            <TextInput
              required
              label={dictionary?.users?.fields?.sub || "OAuth Subject ID"}
              placeholder="oauth-subject-id"
              description="Unikátní identifikátor z OAuth serveru - povinný pro přihlášení"
              {...form.getInputProps("sub")}
            />

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

            <Group justify="flex-end" mt="md">
              <Button
                variant="subtle"
                onClick={() => router.back()}
                disabled={createUser.isPending}
              >
                {dictionary?.common?.cancel || "Cancel"}
              </Button>
              <Button type="submit" loading={createUser.isPending}>
                {dictionary?.users?.form?.createUser || "Create User"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
