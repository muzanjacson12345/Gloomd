export function describeStartupError(reason: unknown): string {
  if (reason instanceof Error && reason.message.trim()) {
    return reason.message.trim();
  }
  if (typeof reason === "string" && reason.trim()) {
    return reason.trim();
  }
  if (
    typeof reason === "object" &&
    reason !== null &&
    "message" in reason &&
    typeof (reason as { message?: unknown }).message === "string" &&
    (reason as { message: string }).message.trim()
  ) {
    return (reason as { message: string }).message.trim();
  }
  return "GLOOMD could not finish starting because the browser reported an unknown error.";
}
