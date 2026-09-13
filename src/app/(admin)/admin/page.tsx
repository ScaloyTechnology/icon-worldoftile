import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="p-[var(--container-gutter)]">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Restricted area foundation
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em]">
          Admin workspace
        </h1>
        <p className="mt-5 max-w-2xl text-muted">
          Module navigation, role enforcement, audit behaviour, and content
          management will be implemented in their dedicated phases.
        </p>
        <Link
          className="mt-8 inline-flex min-h-11 items-center border border-line bg-surface px-5 text-sm font-medium"
          href="/admin/login"
        >
          View login route
        </Link>
      </div>
    </main>
  );
}
