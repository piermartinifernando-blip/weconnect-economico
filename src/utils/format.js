// Formateo de dinero y números

export const fmtMoney = (n) => {
  const v = Number(n || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(v);
};

export const fmtMoney1 = (n) => {
  const v = Number(n || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v);
};

export const fmtNum = (n) => new Intl.NumberFormat("es-AR").format(Number(n || 0));

export const fmtPct = (n, d = 1) => `${Number(n || 0).toFixed(d)}%`;

export const toMillions = (n) => Number(n || 0) / 1_000_000;