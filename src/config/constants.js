// Constantes de negocio
export const CAPEX_OBRA_PROMEDIO = 40_000_000;

export const RED_BASE_MONTH = "2026-03";
export const RED_TODAY_MONTH = "2026-04";
export const RED_TARGET_MONTH = "2027-03";
export const RED_BASE_BOXES = 900;
export const RED_CURRENT_BOXES = 1170;
export const RED_TARGET_BOXES = 3000;
export const RED_SUBSCRIBERS_PER_BOX = 8;
export const RED_CONSERVATIVE_RATE = 0.02;
export const RED_BROWN_GROSS_AVG = 214.33;
export const RED_BROWN_CHURN_AVG = 46.67;
export const RED_BROWN_NET_AVG = 167.67;

// Estas dos se calculan automáticamente a partir de las de arriba
export const RED_BROWN_GROSS_RATE = RED_BROWN_GROSS_AVG / (RED_BASE_BOXES * RED_SUBSCRIBERS_PER_BOX);
export const RED_BROWN_NET_RATE = RED_BROWN_NET_AVG / (RED_BASE_BOXES * RED_SUBSCRIBERS_PER_BOX);