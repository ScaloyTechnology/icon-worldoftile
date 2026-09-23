import type { SVGProps } from "react";

type IconName = "archive" | "category" | "chevron" | "close" | "collection" | "contact" | "dashboard" | "enquiry" | "external" | "menu" | "more" | "plus" | "product" | "project" | "search" | "specification";

export function AdminIcon({ name, ...props }: SVGProps<SVGSVGElement> & Readonly<{ name: IconName }>) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 1.8 };
  return <svg aria-hidden="true" viewBox="0 0 24 24" {...props} {...common}>
    {name === "dashboard" ? <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></> : null}
    {name === "product" ? <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></> : null}
    {name === "category" ? <><path d="M4 5h7v6H4zM13 5h7v4h-7zM4 13h7v6H4zM13 11h7v8h-7z" /></> : null}
    {name === "collection" ? <><path d="m4 7 8-4 8 4-8 4z" /><path d="m4 12 8 4 8-4M4 17l8 4 8-4" /></> : null}
    {name === "specification" ? <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></> : null}
    {name === "project" ? <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m3 15 5-5 4 4 3-3 6 6" /><circle cx="16.5" cy="8.5" r="1.5" /></> : null}
    {name === "enquiry" ? <><path d="M4 5h16v12H8l-4 4z" /><path d="M8 9h8M8 13h5" /></> : null}
    {name === "contact" ? <><path d="M4 5h16v14H4z" /><path d="m4 7 8 6 8-6" /></> : null}
    {name === "menu" ? <><path d="M4 7h16M4 12h16M4 17h16" /></> : null}
    {name === "search" ? <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></> : null}
    {name === "plus" ? <path d="M12 5v14M5 12h14" /> : null}
    {name === "more" ? <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></> : null}
    {name === "external" ? <><path d="M14 5h5v5M19 5l-9 9" /><path d="M19 14v5H5V5h5" /></> : null}
    {name === "archive" ? <><path d="M4 7h16v13H4zM3 4h18v3H3zM9 11h6" /></> : null}
    {name === "chevron" ? <path d="m9 6 6 6-6 6" /> : null}
    {name === "close" ? <path d="m6 6 12 12M18 6 6 18" /> : null}
  </svg>;
}
