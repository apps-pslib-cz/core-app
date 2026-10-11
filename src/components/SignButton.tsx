"use client";

import { Button, ActionIcon, Tooltip } from "@mantine/core";
import { IconLogin, IconLogout } from "@tabler/icons-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMediaQuery } from "@mantine/hooks";
import { useDictionary } from "@/hooks/useDictionary";

type SignButtonBaseProps = {
  breakpoint?: string;
  onSignIn?: () => void;
  onSignOut?: () => void;
};

type SignButtonProps = SignButtonBaseProps & Record<string, unknown>;

const SignButton: React.FC<SignButtonProps> = ({
  breakpoint = "sm",
  onSignIn,
  onSignOut,
  ...rest
}) => {
  const { status } = useSession();
  const { dictionary } = useDictionary();
  const isMobile = useMediaQuery(
    `(max-width: ${breakpoint === "sm" ? "768px" : breakpoint})`,
  );
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  const handleSignIn = onSignIn
    ? onSignIn
    : () => signIn("duende-identity-server6");
  const handleSignOut = onSignOut
    ? onSignOut
    : () => signOut({ callbackUrl: "/" });

  if (isAuthenticated) {
    const signOutLabel = dictionary.auth.signOut;
    return isMobile ? (
      <Tooltip label={signOutLabel} withArrow>
        <ActionIcon
          onClick={handleSignOut}
          disabled={isLoading}
          loading={isLoading}
          size="lg"
          aria-label={signOutLabel}
          {...rest}
        >
          <IconLogout size={20} />
        </ActionIcon>
      </Tooltip>
    ) : (
      <Button
        onClick={handleSignOut}
        disabled={isLoading}
        loading={isLoading}
        leftSection={<IconLogout size={16} />}
        {...rest}
      >
        {signOutLabel}
      </Button>
    );
  }

  const signInLabel = dictionary.auth.signIn;
  return isMobile ? (
    <Tooltip label={signInLabel} withArrow>
      <ActionIcon
        onClick={handleSignIn}
        disabled={isLoading}
        loading={isLoading}
        size="lg"
        aria-label={signInLabel}
        {...rest}
      >
        <IconLogin size={20} />
      </ActionIcon>
    </Tooltip>
  ) : (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      loading={isLoading}
      leftSection={<IconLogin size={16} />}
      {...rest}
    >
      {signInLabel}
    </Button>
  );
};

export default SignButton;
