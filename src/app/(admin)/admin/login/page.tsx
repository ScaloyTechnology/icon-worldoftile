import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin login",
};

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-[70vh] place-items-center p-[var(--container-gutter)]">
      <section className="border-line bg-surface w-full max-w-lg border p-8 sm:p-10">
        <p className="font-mono text-xs tracking-[0.18em] text-muted uppercase">
          Authentication foundation
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em]">
          Admin login
        </h1>
        <p className="mt-5 text-muted">
          The route boundary and validation contract are prepared. Secure
          credential handling and session persistence will be added with the
          admin authentication phase.
        </p>
      </section>
    </main>
  );
}
