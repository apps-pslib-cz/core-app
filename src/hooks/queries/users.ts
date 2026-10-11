"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateUserDto,
  UpdateUserDto,
  UserDetailDto,
} from "@/types/dtos/users";

/**
 * Query-key konvence (viz skill nextjs-tanstack-query-conventions): pole
 * od nejobecnějšího k nejkonkrétnějšímu, aby `invalidateQueries({queryKey:
 * userKeys.all})` zahodil i detaily jednotlivých uživatelů.
 */
export const userKeys = {
  all: ["users"] as const,
  detail: (id: string) => ["users", "detail", id] as const,
};

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return body?.error?.message || body?.message || fallback;
}

async function fetchUser(id: string): Promise<UserDetailDto> {
  const res = await fetch(`/api/v1/users/${id}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res, "Nepodařilo se načíst uživatele"));
  }
  return res.json();
}

/**
 * Detail uživatele - sdílený mezi detailní stránkou a editačním formulářem,
 * takže přechod mezi nimi využije cache (stale-while-revalidate), ne dva
 * nezávislé fetchy.
 */
export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ""),
    queryFn: () => fetchUser(id as string),
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateUserDto) => {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, "Nepodařilo se vytvořit uživatele"),
        );
      }
      return res.json() as Promise<UserDetailDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateUserDto) => {
      const res = await fetch(`/api/v1/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, "Nepodařilo se uložit uživatele"),
        );
      }
      return res.json() as Promise<UserDetailDto>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error(
          await parseErrorMessage(res, "Nepodařilo se smazat uživatele"),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

interface SyncSummary {
  total: number;
  failed: Array<{ id: string; email: string | null; error: string }>;
}

export interface AvatarSyncSummary extends SyncSummary {
  updated: number;
  skipped: number;
}

export interface ActiveSyncSummary extends SyncSummary {
  deactivated: number;
  unchanged: number;
}

export function useSyncAvatars() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AvatarSyncSummary> => {
      const res = await fetch("/api/v1/users/sync-avatars", { method: "POST" });
      if (!res.ok) {
        throw new Error("Aktualizaci avatarů se nepodařilo spustit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useSyncActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ActiveSyncSummary> => {
      const res = await fetch("/api/v1/users/sync-active", { method: "POST" });
      if (!res.ok) {
        throw new Error("Kontrolu aktivity se nepodařilo spustit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
