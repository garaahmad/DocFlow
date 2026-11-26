export function isPlatformAdmin(
  user: { email: string; emailVerified: boolean } | undefined,
) {
  return Boolean(
    user?.emailVerified &&
    (process.env.PLATFORM_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
      .includes(user.email.toLowerCase()),
  );
}
