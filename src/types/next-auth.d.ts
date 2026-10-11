import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      sub?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;

      given_name?: string | null;
      middle_name?: string | null;
      family_name?: string | null;

      // role appky nad tímto uživatelem (viz src/types/roles.ts)
      roles?: string[];
    };
    expires: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sub?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;

    given_name?: string | null;
    middle_name?: string | null;
    family_name?: string | null;

    roles?: string[];
    // pro práci s access/refresh tokeny
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number; // epoch ms
  }
}
