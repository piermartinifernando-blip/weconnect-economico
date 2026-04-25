export const normalizeCity = (city) => {
  const c = String(city || "").trim().toLowerCase();
  if (["almirante brown", "brown", "burzaco", "glew", "longchamps", "longchamp", "ministro rivadavia"].includes(c)) return "Almirante Brown";
  if (c === "florencio varela") return "Florencio Varela";
  if (c === "capitan sarmiento" || c === "capitán sarmiento") return "Capitán Sarmiento";
  return city || "Sin ciudad";
};

export const parseKmlPolygons = (kml) => {
  const placemarks = [...kml.matchAll(/<Placemark[\s\S]*?<\/Placemark>/g)].map((m) => m[0]);
  const polygons = [];
  placemarks.forEach((placemark, idx) => {
    const nameMatch = placemark.match(/<name>([\s\S]*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : `Polígono ${idx + 1}`;
    const coordMatches = [...placemark.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/g)];
    coordMatches.forEach((match, polyIdx) => {
      const coords = match[1]
        .trim()
        .split(/\s+/)
        .map((chunk) => chunk.split(",").map(Number))
        .filter((arr) => arr.length >= 2 && !Number.isNaN(arr[0]) && !Number.isNaN(arr[1]))
        .map(([lng, lat]) => ({ lng, lat }));
      if (coords.length > 2) polygons.push({ name: `${name}${coordMatches.length > 1 ? ` ${polyIdx + 1}` : ""}`, coords });
    });
  });
  return polygons;
};