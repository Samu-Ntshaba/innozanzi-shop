export function isSessionUserEligible(user: { status: string; deletedAt: Date | null }) {
  return user.status === "ACTIVE" && !user.deletedAt;
}
