import {
  AdminPage,
  buttonClass,
  inputClass,
  Panel,
  StatusBadge,
  tableClass,
} from "@/components/admin/admin-ui";
import {
  createCampaign,
  retryMarketingEmail,
  sendCampaign,
} from "@/domain/communications/actions";
import { requirePermission } from "@/domain/auth/session";
import { prisma } from "@/lib/prisma";
export default async function EmailMarketingPage() {
  await requirePermission("customers.manage");
  const [subscribers, campaigns, deliveries] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
      take: 200,
    }),
    prisma.emailCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.findMany({
      where: { type: "EMAIL_OUTBOX" },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const active = subscribers.filter((s) => s.isActive).length;
  return (
    <AdminPage
      title="Email marketing"
      description="Newsletter audience, branded campaigns and system-wide email delivery monitoring."
    >
      <div className="grid grid-cols-3 border border-slate-300 bg-white">
        <Metric label="Active subscribers" value={active} />
        <Metric
          label="Campaigns sent"
          value={campaigns.filter((c) => c.status === "SENT").length}
        />
        <Metric
          label="Failed delivery"
          value={deliveries.filter((d) => d.status === "FAILED").length}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Panel>
          <h2 className="font-semibold">Create campaign</h2>
          <form action={createCampaign} className="mt-4 grid gap-3">
            <input
              className={inputClass}
              name="name"
              placeholder="Internal campaign name"
              required
            />
            <input
              className={inputClass}
              name="subject"
              placeholder="Email subject"
              required
            />
            <input
              className={inputClass}
              name="preview"
              placeholder="Inbox preview text"
            />
            <textarea
              className={`${inputClass} min-h-40`}
              name="html"
              placeholder="Campaign content (basic HTML supported)"
              required
            />
            <button className={buttonClass}>Save draft</button>
          </form>
        </Panel>
        <Panel className="p-0">
          <table className={tableClass}>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Audience</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <br />
                    <span className="text-xs text-slate-500">{c.subject}</span>
                  </td>
                  <td>
                    <StatusBadge value={c.status} />
                  </td>
                  <td>{active}</td>
                  <td>
                    {c.status === "DRAFT" ? (
                      <form action={sendCampaign}>
                        <input type="hidden" name="id" value={c.id} />
                        <button className="font-semibold text-sky-700">
                          Send campaign
                        </button>
                      </form>
                    ) : (
                      c.sentAt?.toLocaleDateString("en-ZA")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <Panel className="p-0">
        <h2 className="p-4 font-semibold">Subscribers</h2>
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Subscriber</th>
              <th>Source</th>
              <th>Status</th>
              <th>Subscribed</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.name ?? "Subscriber"}
                  <br />
                  <span className="text-xs text-slate-500">{s.email}</span>
                </td>
                <td>{s.source}</td>
                <td>
                  <StatusBadge value={s.isActive ? "ACTIVE" : "UNSUBSCRIBED"} />
                </td>
                <td>{s.subscribedAt.toLocaleDateString("en-ZA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel className="p-0">
        <h2 className="p-4 font-semibold">System email delivery</h2>
        <table className={tableClass}>
          <thead>
            <tr>
              <th>Message</th>
              <th>Recipient</th>
              <th>Status</th>
              <th>Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => {
              const data = d.data as { to?: string } | null;
              return (
                <tr key={d.id}>
                  <td>{d.subject}</td>
                  <td>{data?.to ?? "—"}</td>
                  <td>
                    <StatusBadge value={d.status} />
                    {d.error ? (
                      <p className="mt-1 max-w-xs text-xs text-red-700">
                        {d.error}
                      </p>
                    ) : null}
                  </td>
                  <td>{d.createdAt.toLocaleString("en-ZA")}</td>
                  <td>
                    {d.status === "FAILED" ? (
                      <form action={retryMarketingEmail}>
                        <input type="hidden" name="id" value={d.id} />
                        <button className="font-semibold text-sky-700">
                          Retry
                        </button>
                      </form>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </AdminPage>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-r border-slate-300 p-4 last:border-r-0">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
