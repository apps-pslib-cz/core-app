import React from "react";
import { Avatar, Text, Box, Flex } from "@mantine/core";
import { useMounted } from "@mantine/hooks";
import { useSession } from "next-auth/react";

type UserAvatarProps = {
  picture?: string | null;
  fullname?: string | null;
  email?: string | null;
  onClick?: () => void;
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  picture,
  fullname,
  email,
  onClick,
}) => {
  const { data: session } = useSession();
  const mounted = useMounted();
  const isCurrentSessionUser = Boolean(
    session?.user?.email && email && session.user.email === email,
  );

  // Přihlášenému uživateli bereme avatar z DB (/api/v1/me/avatar - stejný
  // origin, <img> si session cookie pošle sám) místo přímé OAuth URL, která
  // bývá nespolehlivá. Bez fetch + URL.createObjectURL nepotřebuje CSP
  // img-src výjimku `blob:`. Když avatar chybí (404), Mantine Avatar sám
  // ukáže iniciály - ale jen když se <img> vytvoří až po hydrataci. Ze
  // serverového HTML by 404 přišla dřív, než React připojí onError, a
  // zůstal by rozbitý obrázek (proto `mounted`).
  const avatarSrc =
    isCurrentSessionUser &&
    (!picture || picture.startsWith("https://oauth.pslib.cz"))
      ? "/api/v1/me/avatar"
      : picture || undefined;

  const initials =
    (fullname ?? email ?? "?")
      .trim()
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "?";

  return (
    <Flex
      gap="sm"
      justify="left"
      align="center"
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: "8px",
        padding: "4px 8px",
      }}
    >
      <Avatar
        visibleFrom="md"
        src={mounted ? avatarSrc : undefined}
        radius={40}
        size={40}
      >
        {initials}
      </Avatar>
      <Box>
        <Text fz="sm" fw={500}>
          {fullname}
        </Text>
        <Text fz="xs" c="dimmed">
          {email}
        </Text>
      </Box>
    </Flex>
  );
};

export default UserAvatar;
