export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className={diagonal ? "arrow diagonal" : "arrow"}><path d="M4 12h15M12 5l7 7-7 7" /></svg>;
}
