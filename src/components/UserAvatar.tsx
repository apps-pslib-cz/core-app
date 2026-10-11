import React, { useState, useEffect } from "react";
import { Avatar, Text, Box, Flex } from "@mantine/core";
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(picture || null);
  const isCurrentSessionUser = Boolean(
    session?.user?.email && email && session.user.email === email,
  );

  // Když se `picture`/`isCurrentSessionUser` změní, nastav avatarUrl na
  // prop hned během renderu (ne v useEffect - React to pro "přizpůsob
  // stav při změně propu" podporuje, viz dokumentace k useState), aby
  // efekt níže musel synchronně volat setState jen uvnitř async
  // .then/.catch, ne přímo ve svém těle.
  const [prevKey, setPrevKey] = useState({ picture, isCurrentSessionUser });
  if (
    prevKey.picture !== picture ||
    prevKey.isCurrentSessionUser !== isCurrentSessionUser
  ) {
    setPrevKey({ picture, isCurrentSessionUser });
    setAvatarUrl(picture || null);
  }

  // Pro aktuálního přihlášeného uživatele zkus načíst avatar z nového API
  useEffect(() => {
    if (
      isCurrentSessionUser &&
      (!picture || picture.startsWith("https://oauth.pslib.cz"))
    ) {
      // Pokud je to aktuální uživatel a nemáme lokální URL, zkus načíst z API
      fetch("/api/v1/me/avatar")
        .then((response) => {
          if (response.ok) {
            return response.blob();
          }
          throw new Error("Avatar not found");
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setAvatarUrl(url);
        })
        .catch(() => {
          // Fallback na původní URL
          setAvatarUrl(picture || null);
        });
    }
  }, [isCurrentSessionUser, picture]);

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
        src={avatarUrl ?? undefined}
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
