import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasPermission, type PermissionKey } from "./permissions";
import { isSessionUserEligible } from "./rules";

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1_000;
const cookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-innozanzi-session"
    : "innozanzi-session";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DURATION_MS);
  const requestHeaders = await headers();

  await prisma.session.create({
    data: {
      sessionToken: hashToken(token),
      userId,
      expires,
      ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
    },
  });

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: hashToken(token) } });
  }
  cookieStore.delete(cookieName);
}

async function getSessionContext() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { sessionToken: hashToken(token) },
    select: {
      id: true,
      expires: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          deletedAt: true,
          mustChangePassword: true,
          temporaryPasswordExpiresAt: true,
          accountType: true,
          companyId: true,
          departmentId: true,
          roles: {
            select: {
              role: {
                select: {
                  slug: true,
                  permissions: {
                    select: {
                      effect: true,
                      permission: { select: { key: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.expires <= new Date() || session.user.deletedAt || !["ACTIVE", "INVITED"].includes(session.user.status)) {
    return null;
  }

  const roles = session.user.roles.map(({ role }) => role.slug);
  const grants = session.user.roles.flatMap(({ role }) =>
    role.permissions.map(({ effect, permission }) => ({ effect, key: permission.key })),
  );

  return {
    sessionId: session.id,
    user: { id: session.user.id, email: session.user.email, name: session.user.name, roles, status: session.user.status, accountType: session.user.accountType, companyId: session.user.companyId, departmentId: session.user.departmentId, mustChangePassword: session.user.mustChangePassword, temporaryPasswordExpiresAt: session.user.temporaryPasswordExpiresAt },
    grants,
    isSuperAdministrator: roles.includes("super-administrator"),
  };
}

export async function getAuthContext() {
  const context = await getSessionContext();
  return context && isSessionUserEligible({ status: context.user.status, deletedAt: null }) && !context.user.mustChangePassword ? context : null;
}

export async function requireActivationUser() {
  const context = await getSessionContext();
  if (!context || context.user.status !== "INVITED" || !context.user.mustChangePassword) redirect("/sign-in");
  if (!context.user.temporaryPasswordExpiresAt || context.user.temporaryPasswordExpiresAt <= new Date()) redirect("/sign-in?error=invitation-expired");
  return context;
}

export async function requireUser() {
  const context = await getAuthContext();
  if (!context) redirect("/sign-in");
  return context;
}

export async function requirePermission(permission: PermissionKey) {
  const context = await requireUser();
  if (!hasPermission(context.grants, permission, context.isSuperAdministrator)) {
    redirect("/unauthorized");
  }
  return context;
}
