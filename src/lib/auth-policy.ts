// Pure policy functions; all identity inputs must come from a verified session.
export function isAllowedAdmin(id: unknown, configuredIds: string | undefined): boolean {
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) return false;
  const ids = (configuredIds ?? "").split(",").map((value) => value.trim());
  return ids.includes(id);
}

export function isSameOrigin(request: Request, configuredUrl?: string): boolean {
  try {
    const expected = new URL(configuredUrl || request.url).origin;
    return request.headers.get("origin") === expected;
  } catch {
    return false;
  }
}
