import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import DOMPurify from "dompurify";
import partners from "./data/partners.json";

export const STATUTS = ["Top Partenaire", "Partenaire", "Partenaire potentiel"];
export const DOMAINES = [
  "CTS",
  "MOBILIER",
  "TECHNIQUE",
  "SANITAIRE",
  "DECORATION",
  "ENERGIE",
  "FABRICANT",
  "AUTRE",
];

const STATUT_RANK = { "Top Partenaire": 0, Partenaire: 1, "Partenaire potentiel": 2 };

// Couleurs des marqueurs, alignées sur la palette jaune / ardoise de l'app
const MARKER_STYLE = {
  "Top Partenaire": { fillColor: "#facc15", color: "#a16207" },
  Partenaire: { fillColor: "#fef08a", color: "#ca8a04" },
  "Partenaire potentiel": { fillColor: "#e2e8f0", color: "#64748b" },
};

const PAGE_SIZE = 30;

function distanceKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalize(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// Recherche hors-ligne : moyenne des partenaires situés dans la ville / le CP
function localGeocode(query) {
  const q = normalize(query).trim();
  if (!q) return null;
  const matches = partners.filter(
    (p) =>
      p.lat != null &&
      (normalize(p.codePostal) === q ||
        normalize(p.ville).split(",")[0].trim() === q)
  );
  if (!matches.length) return null;
  return {
    lat: matches.reduce((s, p) => s + p.lat, 0) / matches.length,
    lng: matches.reduce((s, p) => s + p.lng, 0) / matches.length,
    label: query.toUpperCase(),
  };
}

async function geocode(query) {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        query
      )}&limit=1`
    );
    if (res.ok) {
      const data = await res.json();
      const f = data.features?.[0];
      if (f) {
        const [lng, lat] = f.geometry.coordinates;
        return { lat, lng, label: f.properties.label };
      }
    }
  } catch (e) {
    // pas de réseau : on tente la recherche locale
  }
  return localGeocode(query);
}

function pillClasses(active) {
  const base =
    "px-3 py-1 rounded-full border text-xs transition-all cursor-pointer select-none";
  return active
    ? base + " bg-yellow-300 text-slate-900 border-yellow-500 font-semibold"
    : base + " border-slate-300 bg-white text-slate-800 hover:border-yellow-400";
}

function statutBadge(statut) {
  if (statut === "Top Partenaire")
    return "bg-yellow-300 border-yellow-500 text-slate-900 font-semibold";
  if (statut === "Partenaire")
    return "bg-yellow-100 border-yellow-300 text-slate-900";
  return "bg-slate-100 border-slate-300 text-slate-600";
}

function siteHref(url) {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const PartnersStep = ({
  suggestedDomaines,
  selectedPartnerIds,
  onTogglePartner,
  location,
  setLocation,
}) => {
  const [query, setQuery] = useState(location?.label || "");
  const [search, setSearch] = useState("");
  const [statuts, setStatuts] = useState([]);
  const [domaines, setDomaines] = useState([]);
  const [radius, setRadius] = useState(100);
  const [geoStatus, setGeoStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markersLayer = useRef(null);
  const locationLayer = useRef(null);
  const markerById = useRef({});

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filtered = useMemo(() => {
    const s = normalize(search);
    return partners
      .filter((p) => !statuts.length || statuts.includes(p.statut))
      .filter(
        (p) => !domaines.length || p.domaines.some((d) => domaines.includes(d))
      )
      .filter(
        (p) =>
          !s ||
          normalize(p.name).includes(s) ||
          normalize(p.ville).includes(s) ||
          normalize(p.codePostal).includes(s)
      )
      .map((p) => ({
        ...p,
        distance:
          location && p.lat != null ? distanceKm(location, p) : null,
      }))
      .filter((p) => !location || (p.distance != null && p.distance <= radius))
      .sort((a, b) => {
        if (location) return a.distance - b.distance;
        return (
          STATUT_RANK[a.statut] - STATUT_RANK[b.statut] ||
          a.name.localeCompare(b.name)
        );
      });
  }, [search, statuts, domaines, location, radius]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [search, statuts, domaines, location, radius]);

  // Initialisation de la carte
  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapEl.current, { preferCanvas: true }).setView(
      [46.6, 2.4],
      5
    );
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    locationLayer.current = L.layerGroup().addTo(map);
    map.on("click", (e) => {
      setLocation({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        label: `Point (${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`,
      });
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setLocation]);

  // Marqueurs partenaires
  useEffect(() => {
    const layer = markersLayer.current;
    if (!layer) return;
    layer.clearLayers();
    markerById.current = {};
    filtered.forEach((p) => {
      if (p.lat == null) return;
      const selected = selectedPartnerIds.includes(p.id);
      const style = selected
        ? { fillColor: "#0f172a", color: "#facc15" }
        : MARKER_STYLE[p.statut] || MARKER_STYLE["Partenaire potentiel"];
      const m = L.circleMarker([p.lat, p.lng], {
        radius: p.statut === "Top Partenaire" || selected ? 7 : 5,
        weight: 1.5,
        fillOpacity: 0.95,
        ...style,
      });
      const el = document.createElement("div");
      el.style.fontSize = "12px";
      const title = document.createElement("strong");
      title.textContent = p.name;
      const sub = document.createElement("div");
      sub.style.color = "#64748b";
      sub.textContent = [p.statut, p.domaines.join(", "), p.ville]
        .filter(Boolean)
        .join(" · ");
      el.append(title, sub);
      m.bindPopup(el);
      m.on("click", () => setExpandedId(p.id));
      m.addTo(layer);
      markerById.current[p.id] = m;
    });
  }, [filtered, selectedPartnerIds]);

  // Lieu de l'événement + rayon
  useEffect(() => {
    const layer = locationLayer.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (!location) return;
    const circle = L.circle([location.lat, location.lng], {
      radius: radius * 1000,
      color: "#eab308",
      weight: 1.5,
      fillColor: "#fde047",
      fillOpacity: 0.08,
      interactive: false,
    }).addTo(layer);
    L.circleMarker([location.lat, location.lng], {
      radius: 8,
      color: "#0f172a",
      weight: 3,
      fillColor: "#ffffff",
      fillOpacity: 1,
      interactive: false,
    }).addTo(layer);
    map.fitBounds(circle.getBounds(), { padding: [10, 10] });
  }, [location, radius]);

  const handleLocate = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setLocation(null);
      setGeoStatus("");
      return;
    }
    setGeoStatus("Recherche…");
    const result = await geocode(query.trim());
    if (result) {
      setLocation(result);
      setGeoStatus("");
    } else {
      setGeoStatus("Lieu introuvable");
    }
  };

  const focusPartner = (p) => {
    setExpandedId(expandedId === p.id ? null : p.id);
    const m = markerById.current[p.id];
    if (m && mapRef.current) {
      mapRef.current.setView(m.getLatLng(), Math.max(mapRef.current.getZoom(), 9));
      m.openPopup();
    }
  };

  const geolocated = partners.filter((p) => p.lat != null).length;

  return (
    <div className="space-y-6">
      {/* Lieu de l'événement */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 mb-3">
          Lieu de l'événement
        </h3>
        <form onSubmit={handleLocate} className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Adresse, ville ou code postal…"
            className="flex-1 min-w-[180px] border border-slate-300 rounded-full text-sm px-4 py-2 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-full border text-sm bg-yellow-300 border-yellow-500 font-semibold hover:bg-yellow-400"
          >
            Localiser
          </button>
          {location && (
            <button
              type="button"
              onClick={() => {
                setLocation(null);
                setQuery("");
              }}
              className="px-3 py-2 rounded-full border text-sm border-slate-300 hover:border-red-400 hover:text-red-500"
            >
              Effacer
            </button>
          )}
        </form>
        {geoStatus && (
          <p className="text-xs text-slate-500 -mt-2 mb-3">{geoStatus}</p>
        )}
        {location && (
          <p className="text-xs text-slate-600 -mt-2 mb-3">
            📍 <span className="font-semibold">{location.label}</span>
          </p>
        )}
        <div>
          <label className="text-xs text-slate-600 flex justify-between mb-1">
            <span>Rayon de recherche (10 à 500 km)</span>
            <span className="font-semibold">{radius} km</span>
          </label>
          <input
            type="range"
            min={10}
            max={500}
            step={10}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Astuce : tu peux aussi cliquer directement sur la carte pour placer
          l'événement.
        </p>
      </section>

      {/* Filtres */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Filtres
          </h3>
          {(statuts.length > 0 || domaines.length > 0 || search) && (
            <button
              type="button"
              onClick={() => {
                setStatuts([]);
                setDomaines([]);
                setSearch("");
              }}
              className="text-[11px] text-slate-500 hover:text-slate-900 underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un partenaire, une ville…"
          className="w-full border border-slate-300 rounded-full text-sm px-4 py-2 focus:outline-none focus:ring-1 focus:ring-yellow-400"
        />
        <div className="flex flex-wrap gap-2">
          {STATUTS.map((s) => (
            <button
              key={s}
              type="button"
              className={pillClasses(statuts.includes(s))}
              onClick={() => toggle(statuts, setStatuts, s)}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {DOMAINES.map((d) => (
            <button
              key={d}
              type="button"
              className={pillClasses(domaines.includes(d))}
              onClick={() => toggle(domaines, setDomaines, d)}
            >
              {d}
            </button>
          ))}
        </div>
        {suggestedDomaines.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
            <span className="text-[11px] text-slate-600">
              D'après la qualification : {suggestedDomaines.join(", ")}
            </span>
            <button
              type="button"
              onClick={() => setDomaines(suggestedDomaines)}
              className="text-[11px] px-3 py-1 rounded-full border border-slate-300 bg-white hover:border-yellow-400"
            >
              Appliquer
            </button>
          </div>
        )}
      </section>

      {/* Carte */}
      <section className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        <div ref={mapEl} className="h-80 w-full rounded-xl overflow-hidden z-0" />
        <div className="flex flex-wrap gap-3 px-2 pt-2 text-[11px] text-slate-600">
          {STATUTS.map((s) => (
            <span key={s} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-full border"
                style={{
                  backgroundColor: MARKER_STYLE[s].fillColor,
                  borderColor: MARKER_STYLE[s].color,
                }}
              />
              {s}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full border bg-slate-900 border-yellow-400" />
            Ajouté au devis
          </span>
        </div>
      </section>

      {/* Liste */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
            Partenaires
          </h3>
          <span className="text-[11px] text-slate-500">
            {filtered.length} résultat{filtered.length > 1 ? "s" : ""} ·{" "}
            {partners.length} partenaires ({geolocated} géolocalisés)
          </span>
        </div>

        {!filtered.length && (
          <p className="text-xs text-slate-400 italic">
            Aucun partenaire ne correspond. Élargis le rayon ou les filtres.
          </p>
        )}

        <ul className="space-y-2 max-h-[640px] overflow-auto pr-1">
          {filtered.slice(0, visibleCount).map((p) => {
            const isSelected = selectedPartnerIds.includes(p.id);
            const isOpen = expandedId === p.id;
            const href = siteHref(p.siteInternet);
            return (
              <li
                key={p.id}
                className={`border rounded-xl p-3 transition-all ${
                  isSelected
                    ? "border-yellow-500 bg-yellow-50"
                    : "border-slate-200 hover:border-yellow-400"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => focusPartner(p)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border ${statutBadge(
                          p.statut
                        )}`}
                      >
                        {p.statut}
                      </span>
                      {p.distance != null && (
                        <span className="text-[11px] text-slate-500">
                          {Math.round(p.distance)} km
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {p.adresseEntrepot ||
                        [p.adresse, p.codePostal, p.ville]
                          .filter(Boolean)
                          .join(" ") ||
                        "Adresse non renseignée"}
                    </p>
                    {p.domaines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.domaines.map((d) => (
                          <span
                            key={d}
                            className="text-[10px] px-2 py-0.5 rounded-full border border-slate-200 text-slate-600"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePartner(p)}
                    className={`text-[11px] px-3 py-1 rounded-full border flex-shrink-0 ${
                      isSelected
                        ? "bg-yellow-300 border-yellow-500 font-semibold"
                        : "border-slate-300 hover:border-yellow-400 hover:bg-yellow-50"
                    }`}
                  >
                    {isSelected ? "✓ Au devis" : "+ Devis"}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-[11px]">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                      {p.number && <span>Réf. {p.number}</span>}
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="underline hover:text-slate-900"
                        >
                          {p.siteInternet}
                        </a>
                      )}
                      {p.lat == null && <span>Non géolocalisé</span>}
                    </div>
                    {p.materiel ? (
                      <div
                        className="partner-materiel max-h-64 overflow-auto pr-1 text-slate-700"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(p.materiel, {
                            FORBID_ATTR: ["style"],
                          }),
                        }}
                      />
                    ) : (
                      <p className="text-slate-400 italic">
                        Pas de détail matériel renseigné.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {filtered.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="mt-3 w-full px-3 py-2 rounded-full text-xs border border-dashed border-slate-300 hover:border-yellow-400"
          >
            Afficher plus ({filtered.length - visibleCount} restants)
          </button>
        )}
      </section>
    </div>
  );
};

export default PartnersStep;
