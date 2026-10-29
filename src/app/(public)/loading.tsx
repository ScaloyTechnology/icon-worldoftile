/** The persistent layout owns the overlay; route fallbacks only mark pending content. */
export default function PublicLoading() {
  return <main id="main" style={{ minHeight: "100svh", background: "#050505", color: "#ece9e4", display: "grid", placeItems: "center" }}>
    <p data-route-pending role="status">Preparing your page...</p>
  </main>;
}
