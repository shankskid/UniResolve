import { getSlaProgress } from "../utils/slaHelpers";

export default function SLACountdown({ ticket }) {
  const { pct, tone, remainingText } = getSlaProgress(ticket);
  const color = tone === "danger" ? "#dc2626" : tone === "warn" ? "#d97706" : "#16a34a";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.2rem" }}>
        <span>SLA</span>
        <span style={{ color }}>{remainingText}</span>
      </div>
      <div style={{ width: "100%", background: "#e2e8f0", borderRadius: "999px", height: "7px" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "999px",
            background: color
          }}
        />
      </div>
    </div>
  );
}
