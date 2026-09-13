"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="holding-page section"><p className="eyebrow">ICON</p><h1>Something interrupted this page.</h1><p>Please try again.</p><button className="button" onClick={reset}>Try again</button></main>; }
