export const authRoles = ["Admin", "CEO", "Manager", "Employee"] as const;

export type AuthRole = (typeof authRoles)[number];

export type JwtReadyAuthPayload = {
  email: string;
  role?: AuthRole;
  rememberMe?: boolean;
};

export type JwtReadySession = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: JwtReadyAuthPayload;
};
