export function getSlaProgress(ticket) {
  if (!ticket?.sla_deadline || !ticket?.created_at) {
    return { pct: 0, tone: "ok", remainingText: "No SLA" };
  }
  const created = new Date(ticket.created_at).getTime();
  const deadline = new Date(ticket.sla_deadline).getTime();
  const now = Date.now();

  if (!Number.isFinite(created) || !Number.isFinite(deadline) || deadline <= created) {
    return { pct: 0, tone: "ok", remainingText: "No SLA" };
  }

  const pct = Math.max(0, Math.min(100, ((now - created) / (deadline - created)) * 100));
  const remainingMs = deadline - now;
  const hours = Math.abs(remainingMs) / (1000 * 60 * 60);
  const remainingText = remainingMs >= 0 ? `${hours.toFixed(1)}h left` : `${hours.toFixed(1)}h overdue`;
  const tone = pct >= 100 ? "danger" : pct >= 75 ? "warn" : "ok";
  return { pct, tone, remainingText };
}
