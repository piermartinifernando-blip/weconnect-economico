// Utilidades de fechas

export const monthShort = (mes) => {
  if (!mes || typeof mes !== "string" || !mes.includes("-")) return mes || "";
  const [y, m] = mes.split("-");
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${names[Number(m) - 1] || m}-${String(y).slice(2)}`;
};

export const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const buildMonthRange = (startYm, endYm) => {
  const [sy, sm] = startYm.split("-").map(Number);
  const [ey, em] = endYm.split("-").map(Number);
  const result = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return result;
};

export const lerp = (a, b, t) => a + (b - a) * t;

export const parseYearMonth = (ym) => {
  if (!ym || typeof ym !== "string" || !ym.includes("-")) return null;
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return null;
  return { y, m };
};

export const monthDiff = (startYm, endYm) => {
  const s = parseYearMonth(startYm);
  const e = parseYearMonth(endYm);
  if (!s || !e) return null;
  return (e.y - s.y) * 12 + (e.m - s.m);
};