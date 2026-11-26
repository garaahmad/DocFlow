"use client";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <div className="panel empty" role="alert">
      <h2>Workspace temporarily unavailable</h2>
      <p>Try loading the page again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
