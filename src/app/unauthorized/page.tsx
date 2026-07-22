import Link from "next/link";

export default function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><h1 className="text-3xl font-semibold">Access denied</h1><p className="mt-2 text-zinc-600">Your account does not have permission to view this area.</p><Link className="mt-6 inline-block underline" href="/account">Return to your account</Link></div></main>;
}
