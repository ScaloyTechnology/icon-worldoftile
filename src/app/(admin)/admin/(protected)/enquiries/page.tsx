import Link from "next/link";

import { AdminEnquiryStatus } from "@/components/admin/admin-enquiry-status";
import enquiryStyles from "@/components/admin/admin-enquiries.module.css";
import { AdminEmptyState, AdminFilter, AdminPageHeader, AdminSearch, AdminTableShell } from "@/components/admin/admin-ui";
import { updateEnquiryStatus } from "@/server/admin/enquiry-actions";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

const statuses = ["NEW", "IN_PROGRESS", "CLOSED", "SPAM"] as const;
type EnquiryStatus = (typeof statuses)[number];
type Query = Readonly<{ q?: string; status?: string; view?: string; error?: string; updated?: string }>;

function validStatus(value: string | undefined): EnquiryStatus | null {
  return statuses.find((status) => status === value) ?? null;
}

function cleanId(value: string | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 64) : "";
}

function enquiriesHref(parameters: Record<string, string | undefined>) {
  const values = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => { if (value) values.set(key, value); });
  const suffix = values.toString();
  return suffix ? `/admin/enquiries?${suffix}` : "/admin/enquiries";
}

function enquiryContent(message: string) {
  const match = /^\[([^\]]+)]\n\n([\s\S]*)$/.exec(message);
  return match ? { type: match[1] ?? "General enquiry", message: match[2] ?? "" } : { type: "General enquiry", message };
}

function dateTime(value: Date) {
  return value.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminEnquiriesPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = validStatus(query.status);
  const viewId = cleanId(query.view);
  let unavailable = false;
  let enquiries: Awaited<ReturnType<typeof readEnquiries>> = [];
  let selected: Awaited<ReturnType<typeof readEnquiry>> = null;

  try {
    [enquiries, selected] = await Promise.all([
      readEnquiries(search, status),
      viewId ? readEnquiry(viewId) : Promise.resolve(null),
    ]);
  } catch (cause) {
    console.error("Admin Enquiries could not be loaded", cause);
    unavailable = true;
  }

  const preserved = { q: search || undefined, status: status ?? undefined };
  const listHref = enquiriesHref(preserved);
  const returnTo = enquiriesHref({ ...preserved, view: selected?.id });

  return <main className={enquiryStyles.page}>
    <AdminPageHeader eyebrow="Operations" title="Enquiries" description="Review and manage customer enquiries submitted through the public website." />

    {query.error ? <p className={enquiryStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.updated === "1" ? <p className={`${enquiryStyles.notice} ${enquiryStyles.noticeSuccess}`} role="status">Enquiry status updated.</p> : null}
    {unavailable ? <p className={enquiryStyles.notice} role="alert">Enquiries are temporarily unavailable. No records were changed.</p> : null}

    <form className={enquiryStyles.filters}>
      <AdminSearch defaultValue={search} label="Search Enquiries" placeholder="Search name, email, phone or message" />
      <AdminFilter defaultValue={status ?? ""} label="Filter by status" name="status">
        <option value="">All statuses</option>
        <option value="NEW">New</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="CLOSED">Closed</option>
        <option value="SPAM">Spam</option>
      </AdminFilter>
      <button type="submit">Apply</button>
      <Link className={enquiryStyles.reset} href="/admin/enquiries">Reset</Link>
    </form>

    <div className={enquiryStyles.results}><span><strong>{enquiries.length}</strong> {enquiries.length === 1 ? "enquiry" : "enquiries"}</span><span>Live database records</span></div>

    {!unavailable ? <AdminTableShell><div className={enquiryStyles.tableScroll}><table className={enquiryStyles.table}>
      <thead><tr><th>Customer</th><th>Enquiry type</th><th>Phone</th><th>Message</th><th>Status</th><th>Submitted</th><th><span>Details</span></th></tr></thead>
      <tbody>{enquiries.length ? enquiries.map((enquiry) => {
        const content = enquiryContent(enquiry.message);
        const viewHref = enquiriesHref({ ...preserved, view: enquiry.id });
        return <tr key={enquiry.id}>
          <td><span className={enquiryStyles.identity}><strong>{enquiry.name}</strong><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a></span></td>
          <td><span className={enquiryStyles.type}>{content.type}</span></td>
          <td>{enquiry.phone ? <a className={enquiryStyles.phone} href={`tel:${enquiry.phone}`}>{enquiry.phone}</a> : <span>—</span>}</td>
          <td><span className={enquiryStyles.message} title={content.message}>{content.message}</span></td>
          <td><AdminEnquiryStatus action={updateEnquiryStatus} id={enquiry.id} label={`Change status for ${enquiry.name}`} returnTo={listHref} status={enquiry.status} /></td>
          <td><time className={enquiryStyles.submitted} dateTime={enquiry.createdAt.toISOString()}>{dateTime(enquiry.createdAt)}</time></td>
          <td><Link className={enquiryStyles.viewLink} href={viewHref}>View</Link></td>
        </tr>;
      }) : <tr className={enquiryStyles.emptyRow}><td colSpan={7}><AdminEmptyState title="No enquiries found.">New website enquiries will appear here automatically.</AdminEmptyState></td></tr>}</tbody>
    </table></div></AdminTableShell> : null}

    {selected ? <div className={enquiryStyles.backdrop}>
      <section aria-labelledby="enquiry-detail-title" aria-modal="true" className={enquiryStyles.dialog} role="dialog">
        <header className={enquiryStyles.dialogHeader}><div><p>{enquiryContent(selected.message).type}</p><h2 id="enquiry-detail-title">{selected.name}</h2></div><Link aria-label="Close enquiry details" className={enquiryStyles.close} href={listHref}>×</Link></header>
        <div className={enquiryStyles.dialogBody}>
          <div className={enquiryStyles.detailGrid}>
            <div className={enquiryStyles.detail}><span>Email address</span><a href={`mailto:${selected.email}`}>{selected.email}</a></div>
            <div className={enquiryStyles.detail}><span>Phone number</span>{selected.phone ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : <strong>Not provided</strong>}</div>
            <div className={enquiryStyles.detail}><span>Submitted</span><strong>{dateTime(selected.createdAt)}</strong></div>
            <div className={enquiryStyles.detail}><span>Consent recorded</span><strong>{dateTime(selected.consentAt)}</strong></div>
            <div className={enquiryStyles.detail}><span>Consent version</span><strong>{selected.consentVersion}</strong></div>
            <div className={enquiryStyles.detail}><span>Source</span><strong>Website contact form</strong></div>
          </div>
          <div className={enquiryStyles.messageBlock}><span>Customer message</span><p>{enquiryContent(selected.message).message}</p></div>
        </div>
        <footer className={enquiryStyles.dialogFooter}><span>Reference: {selected.id}</span><AdminEnquiryStatus action={updateEnquiryStatus} id={selected.id} label={`Change status for ${selected.name}`} returnTo={returnTo} status={selected.status} /></footer>
      </section>
    </div> : null}
  </main>;
}

async function readEnquiries(search: string, status: EnquiryStatus | null) {
  return getDb().enquiry.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { message: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    select: { id: true, name: true, email: true, phone: true, message: true, status: true, consentAt: true, consentVersion: true, createdAt: true, updatedAt: true },
  });
}

async function readEnquiry(id: string) {
  return getDb().enquiry.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, phone: true, message: true, status: true, consentAt: true, consentVersion: true, createdAt: true, updatedAt: true },
  });
}
