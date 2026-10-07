import React, { useCallback, useState } from "react";
import PartnersStep from "./PartnersStep.jsx";

const steps = [
  { id: "evenement", label: "Événement" },
  { id: "lieux", label: "Lieux" },
  { id: "materiel", label: "Matériel" },
  { id: "amenagements", label: "Aménagements" },
  { id: "partenaires", label: "Partenaires" },
];

const config = {
  evenement: {
    title: "Événement",
    groups: [
      {
        label: "Type d'événement",
        options: [
          "Mariage",
          "Événement d’entreprise",
          "Événement familial",
          "Religieux",
          "Anniversaire",
          "Vente",
          "Sportif",
          "Associatif",
        ],
      },
      {
        label: "Durée",
        options: ["Jour(s)", "Week-end", "Semaine", "Mois", "Année"],
      },
      {
        label: "Invités",
        options: ["Adultes", "Enfants", "Seniors", "PMR"],
      },
    ],
  },
  lieux: {
    title: "Lieux",
    groups: [
      {
        label: "Type de lieu",
        options: [
          "location",
          "entreprise",
          "familial",
          "jardin",
          "restaurant",
          "terrasse",
          "domaine",
          "château",
          "parking",
          "parc",
          "montagne",
          "rooftop",
          "lieu public",
          "forêt",
          "terrain",
        ],
      },
      {
        label: "Terrain",
        options: [
          "accessible",
          "difficile d’accès",
          "en pente",
          "plat",
          "en altitude",
          "exposé au vent",
          "beton",
          "herbe",
          "sable",
          "terre",
          "pierre",
          "gravier",
          "bois",
        ],
      },
      {
        label: "Ancrage",
        options: [
          "piquetage",
          "lestage",
          "fixation façade",
          "fixation bâtiment",
        ],
      },
    ],
  },
  materiel: {
    title: "Matériel (structures)",
    groups: [
      {
        label: "CTS",
        options: [
          "tente de réception",
          "tente silhouette",
          "tente stretch",
          "chapiteau bambou",
          "tente verrière",
          "pagode",
          "tipi",
          "rooftop",
          "pergola",
          "structure sur pont",
        ],
      },
      {
        label: "Configuration",
        options: [
          "cristal",
          "blanc",
          "toit cristal",
          "toit blanc",
          "rideau cristal",
          "rideaux blanc",
          "auvent",
          "option pluie",
          "ouverte",
          "côté rabattu",
          "Vélum plissé",
          "Vélum tendu",
        ],
      },
      {
        label: "Plancher",
        options: [
          "sur ossature",
          "flottant",
          "cassette",
          "piste de danse",
          "échafaudage",
          "sol naturel",
          "moquette",
          "lino",
        ],
      },
      {
        label: "Éclairage",
        options: [
          "de base",
          "spot autonome",
          "guirlande guinguette",
          "ciel étoilé",
          "plafond de guirlande",
          "caroussel",
          "spot extérieur",
          "piste de danse",
        ],
      },
    ],
  },
  amenagements: {
    title: "Aménagements",
    groups: [
      {
        label: "Audiovisuel",
        options: ["ecran", "sonorisation", "prise de parole", "piste de danse"],
      },
      {
        label: "Sanitaire",
        options: ["cabine", "caravane", "sèche", "autonome", "douche", "lave main", "urinoire"],
      },
      {
        label: "Confort / énergie",
        options: [
          "chauffage électrique",
          "chauffage fioul",
          "champignon gaz",
          "groupe électrogène",
          "distribution",
        ],
      },
    ],
  },
};

// intensity: 0 = off, 1 = jaune clair, 2 = jaune foncé + gras
function getOptionClasses(intensity) {
  let base =
    "px-3 py-2 rounded-full border text-sm transition-all cursor-pointer select-none";
  if (intensity === 0) {
    return (
      base +
      " border-slate-300 bg-white text-slate-800 hover:border-yellow-400"
    );
  }
  if (intensity === 1) {
    return base + " bg-yellow-100 text-slate-900 border-yellow-300";
  }
  if (intensity === 2) {
    return (
      base +
      " bg-yellow-300 text-slate-900 border-yellow-500 font-semibold"
    );
  }
  return base;
}

const QuoteConfigurator = () => {
  const [activeStep, setActiveStep] = useState("evenement");
  const [selections, setSelections] = useState({});
  const [materielConfigs, setMaterielConfigs] = useState([{}]);
  const [activeMaterielIndex, setActiveMaterielIndex] = useState(0);

  const [dureeQty, setDureeQty] = useState(1);
  const [invitesQty, setInvitesQty] = useState(1);

  const [notes, setNotes] = useState("");
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [eventLocation, setEventLocationState] = useState(null);
  const setEventLocation = useCallback((loc) => setEventLocationState(loc), []);

  const togglePartner = (partner) => {
    setSelectedPartners((prev) =>
      prev.some((p) => p.id === partner.id)
        ? prev.filter((p) => p.id !== partner.id)
        : [...prev, partner]
    );
  };

  // Domaines partenaires suggérés à partir des choix de qualification
  const suggestedDomaines = (() => {
    const set = new Set();
    if (materielConfigs.some((c) => Object.values(c).some((g) => Object.keys(g || {}).length))) {
      set.add("CTS");
    }
    const amen = selections["amenagements"] || {};
    if (Object.keys(amen["Sanitaire"] || {}).length) set.add("SANITAIRE");
    if (Object.keys(amen["Confort / énergie"] || {}).length) set.add("ENERGIE");
    if (
      Object.keys(amen["Audiovisuel"] || {}).length ||
      materielConfigs.some((c) => Object.keys(c["Éclairage"] || {}).length)
    ) {
      set.add("TECHNIQUE");
    }
    return [...set];
  })();
  const [copyStatus, setCopyStatus] = useState("");

  const cycleIntensity = (current) => {
    const next = (current + 1) % 3; // 0 → 1 → 2 → 0
    return next;
  };

  const handleOptionClick = (stepId, groupLabel, optionLabel) => {
    if (stepId === "materiel") {
      setMaterielConfigs((prev) => {
        const copy = [...prev];
        const stepConf = copy[activeMaterielIndex] || {};
        const group = stepConf[groupLabel] || {};
        const current = group[optionLabel] || 0;
        const next = cycleIntensity(current);

        const newGroup = { ...group };
        if (next === 0) {
          delete newGroup[optionLabel];
        } else {
          newGroup[optionLabel] = next;
        }

        const newStep = { ...stepConf, [groupLabel]: newGroup };
        copy[activeMaterielIndex] = newStep;
        return copy;
      });
    } else {
      setSelections((prev) => {
        const step = prev[stepId] || {};
        const group = step[groupLabel] || {};
        const current = group[optionLabel] || 0;
        const next = cycleIntensity(current);

        const newGroup = { ...group };
        if (next === 0) {
          delete newGroup[optionLabel];
        } else {
          newGroup[optionLabel] = next;
        }

        const newStep = { ...step, [groupLabel]: newGroup };

        return {
          ...prev,
          [stepId]: newStep,
        };
      });
    }
  };

  const getIntensity = (stepId, groupLabel, optionLabel) => {
    if (stepId === "materiel") {
      const current = materielConfigs[activeMaterielIndex] || {};
      return current[groupLabel]?.[optionLabel] || 0;
    }
    return selections[stepId]?.[groupLabel]?.[optionLabel] || 0;
  };

  const addMaterielConfig = () => {
    setMaterielConfigs((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, {}];
    });
    setActiveMaterielIndex((prev) => Math.min(prev + 1, 4));
  };

  const deleteMaterielConfig = (index) => {
    setMaterielConfigs((prev) => {
      if (prev.length === 1) {
        return [{}];
      }
      const copy = [...prev];
      copy.splice(index, 1);
      return copy.length ? copy : [{}];
    });
    setActiveMaterielIndex((prev) => {
      if (prev > index) return prev - 1;
      if (prev === index) return Math.max(0, prev - 1);
      return prev;
    });
  };

  // Helper: render list with bold if intensity = 2
  const renderOptionList = (groupObj, keyPrefix) => {
    const entries = Object.entries(groupObj || {});
    return entries.map(([label, intensity], idx) => (
      <span key={keyPrefix + "-" + label}>
        {intensity === 2 ? (
          <span className="font-semibold">{label}</span>
        ) : (
          label
        )}
        {idx < entries.length - 1 && ", "}
      </span>
    ));
  };

  const currentConfig = config[activeStep];

  const buildCTSDescriptionNode = (conf, index) => {
    if (!conf) return null;
    const groupsOrder = ["CTS", "Configuration", "Plancher", "Éclairage"];
    const merged = {};
    groupsOrder.forEach((g) => {
      if (conf[g]) {
        Object.entries(conf[g]).forEach(([label, intensity]) => {
          merged[label] = intensity;
        });
      }
    });
    const labels = Object.keys(merged);
    if (!labels.length) return null;
    return (
      <p key={index} className="ml-2 text-[11px]">
        {`CTS ${index + 1} : `}
        {renderOptionList(merged, "cts-" + index)}
      </p>
    );
  };

  const buildCTSDescriptionText = (conf, index) => {
    if (!conf) return null;
    const groupsOrder = ["CTS", "Configuration", "Plancher", "Éclairage"];
    const labels = [];
    groupsOrder.forEach((g) => {
      if (conf[g]) {
        labels.push(...Object.keys(conf[g]));
      }
    });
    if (!labels.length) return null;
    return `CTS ${index + 1} : ${labels.join(", ")}`;
  };

  const buildSummaryText = () => {
    const lines = [];

    // Événement résumé compact
    const evt = selections["evenement"] || {};
    const typeEvt = evt["Type d'événement"] || {};
    const dureeOpts = evt["Durée"] || {};
    const invitesOpts = evt["Invités"] || {};

    const hasEvt =
      Object.keys(typeEvt).length ||
      Object.keys(dureeOpts).length ||
      Object.keys(invitesOpts).length ||
      dureeQty ||
      invitesQty;

    if (hasEvt) {
      lines.push("Événement :");
      const parts = [];
      if (Object.keys(typeEvt).length) {
        parts.push(Object.keys(typeEvt).join(", "));
      }
      if (dureeQty && Object.keys(dureeOpts).length) {
        parts.push(`${dureeQty} ${Object.keys(dureeOpts).join(", ")}`);
      }
      if (invitesQty && Object.keys(invitesOpts).length) {
        parts.push(`${invitesQty} ${Object.keys(invitesOpts).join(", ")}`);
      }
      if (parts.length) {
        lines.push("  " + parts.join(", "));
      }
      lines.push("");
    }

    // Lieux & Aménagements
    ["lieux", "amenagements"].forEach((stepId) => {
      const stepSelections = selections[stepId];
      if (!stepSelections || !Object.keys(stepSelections).length) return;
      const title = config[stepId].title;
      lines.push(title + " :");
      Object.entries(stepSelections).forEach(([groupLabel, opts]) => {
        const optLabels = Object.keys(opts || {});
        if (!optLabels.length) return;
        lines.push(`  ${groupLabel} : ${optLabels.join(", ")}`);
      });
      lines.push("");
    });

    // Matériel / CTS
    const ctsLines = materielConfigs
      .map((conf, idx) => buildCTSDescriptionText(conf, idx))
      .filter(Boolean);
    if (ctsLines.length) {
      const surface = invitesQty ? Math.round(invitesQty * 1.2) : 0;
      if (surface) {
        lines.push(`Matériel (CTS) ~ ${surface} m² :`);
      } else {
        lines.push("Matériel (CTS) :");
      }
      ctsLines.forEach((l) => lines.push("  " + l));
      lines.push("");
    }

    if (selectedPartners.length) {
      lines.push("Partenaires :");
      if (eventLocation) lines.push(`  Lieu : ${eventLocation.label}`);
      selectedPartners.forEach((p) => {
        const parts = [p.name, p.statut, p.ville].filter(Boolean);
        lines.push(`  ${parts.join(" – ")}`);
      });
      lines.push("");
    }

    if (notes.trim()) {
      lines.push("Notes :");
      lines.push(notes.trim());
    }

    return lines.join("\n");
  };

  const handleCopySummary = async () => {
    try {
      const text = buildSummaryText();
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copié !");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (e) {
      setCopyStatus("Impossible de copier");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  const hasAnySelection =
    Object.keys(selections).some(
      (k) => selections[k] && Object.keys(selections[k]).length > 0
    ) ||
    materielConfigs.some((conf, idx) => buildCTSDescriptionText(conf, idx)) ||
    selectedPartners.length > 0;

  // Rendu
  return (
    <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row gap-6">
        {/* Colonne gauche – steps */}
        <aside className="md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-200 pr-0 md:pr-6">
          <div className="flex items-center justify-between md:block mb-4 md:mb-8">
            <h1 className="text-lg md:text-xl font-semibold">
              Call qualification
            </h1>
            <span className="text-xs text-slate-500 md:block hidden">
              Maquette UI-UX
            </span>
          </div>

          <nav className="space-y-2">
            {steps.map((step, index) => {
              const isActive = step.id === activeStep;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all ${
                    isActive
                      ? "bg-yellow-300 text-slate-900 font-semibold shadow-sm border border-yellow-500"
                      : "bg-white text-slate-800 border border-slate-300 hover:border-yellow-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${
                      isActive
                        ? "bg-slate-900 text-yellow-300"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          <p className="text-xs text-slate-500 mt-6 hidden md:block">
            Clique une première fois sur un bouton pour le sélectionner, une
            deuxième fois si c’est un élément important, et une troisième fois
            pour le réinitialiser.
          </p>
        </aside>

        {/* Colonne centrale – écran */}
        <main className="flex-1 space-y-4">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {currentConfig ? currentConfig.title : "Partenaires"}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {currentConfig
                  ? "Sélectionne les options qui correspondent au projet. Les curseurs te permettent d'ajuster les quantités."
                  : "Trouve les partenaires proches du lieu de l'événement et ajoute-les au devis."}
              </p>
            </div>
          </header>

          {activeStep === "materiel" && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-slate-600 font-medium">
                Structures CTS :
              </span>
              {materielConfigs.map((_, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1"
                >
                  <button
                    type="button"
                    onClick={() => setActiveMaterielIndex(idx)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      activeMaterielIndex === idx
                        ? "bg-yellow-300 border-yellow-500 font-semibold shadow-sm"
                        : "bg-white border-slate-300 hover:border-yellow-400"
                    }`}
                  >
                    CTS {idx + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMaterielConfig(idx)}
                    className="w-6 h-6 flex items-center justify-center text-xs border border-slate-300 rounded-full hover:border-red-400 hover:text-red-500"
                    aria-label={`Supprimer CTS ${idx + 1}`}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {materielConfigs.length < 5 && (
                <button
                  type="button"
                  onClick={addMaterielConfig}
                  className="px-3 py-1 rounded-full text-xs border border-dashed border-slate-300 hover:border-yellow-400"
                >
                  + Ajouter une structure
                </button>
              )}
            </div>
          )}

          {activeStep === "partenaires" && (
            <PartnersStep
              suggestedDomaines={suggestedDomaines}
              selectedPartnerIds={selectedPartners.map((p) => p.id)}
              onTogglePartner={togglePartner}
              location={eventLocation}
              setLocation={setEventLocation}
            />
          )}

          <div className="space-y-6">
            {(currentConfig?.groups || []).map((group) => {
              const isTypeLieu =
                activeStep === "lieux" && group.label === "Type de lieu";

              return (
                <section
                  key={group.label}
                  className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                      {group.label}
                    </h3>
                  </div>

                  {/* Curseurs spécifiques */}
                  {activeStep === "evenement" && group.label === "Durée" && (
                    <div className="mb-4">
                      <label className="text-xs text-slate-600 flex justify-between mb-1">
                        <span>Durée (1 à 12)</span>
                        <span className="font-semibold">{dureeQty}</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={12}
                        value={dureeQty}
                        onChange={(e) => setDureeQty(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}

                  {activeStep === "evenement" && group.label === "Invités" && (
                    <div className="mb-4">
                      <label className="text-xs text-slate-600 flex justify-between mb-1">
                        <span>Nombre d'invités (1 à 1000)</span>
                        <span className="font-semibold">{invitesQty}</span>
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={1000}
                        value={invitesQty}
                        onChange={(e) => setInvitesQty(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {isTypeLieu ? (
                      <>
                        <div className="flex gap-2 w-full">
                          {["location", "entreprise", "familial"].map(
                            (option) => {
                              const intensity = getIntensity(
                                activeStep,
                                group.label,
                                option
                              );
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  className={getOptionClasses(intensity)}
                                  onClick={() =>
                                    handleOptionClick(
                                      activeStep,
                                      group.label,
                                      option
                                    )
                                  }
                                >
                                  {option}
                                </button>
                              );
                            }
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {group.options
                            .filter(
                              (o) =>
                                !["location", "entreprise", "familial"].includes(
                                  o
                                )
                            )
                            .map((option) => {
                              const intensity = getIntensity(
                                activeStep,
                                group.label,
                                option
                              );
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  className={getOptionClasses(intensity)}
                                  onClick={() =>
                                    handleOptionClick(
                                      activeStep,
                                      group.label,
                                      option
                                    )
                                  }
                                >
                                  {option}
                                </button>
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      group.options.map((option) => {
                        const intensity = getIntensity(
                          activeStep,
                          group.label,
                          option
                        );
                        return (
                          <button
                            key={option}
                            type="button"
                            className={getOptionClasses(intensity)}
                            onClick={() =>
                              handleOptionClick(
                                activeStep,
                                group.label,
                                option
                              )
                            }
                          >
                            {option}
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </main>

        {/* Colonne droite – résumé devis + notes */}
        <aside className="md:w-80 flex-shrink-0 bg-white border border-slate-200 rounded-2xl p-4 md:p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                Résumé du devis
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Vue synthétique des choix, prête à être copiée dans un mail ou
                un devis.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={handleCopySummary}
                className="text-[11px] px-3 py-1 rounded-full border border-slate-300 hover:border-yellow-400 hover:bg-yellow-50"
              >
                Copier
              </button>
              {copyStatus && (
                <span className="text-[10px] text-slate-500">
                  {copyStatus}
                </span>
              )}
            </div>
          </div>

          <div className="h-px bg-slate-200" />

          <div className="space-y-3 max-h-72 overflow-auto pr-1 text-xs">
            {/* Événement */}
            {(() => {
              const evt = selections["evenement"] || {};
              const typeEvt = evt["Type d'événement"] || {};
              const dureeOpts = evt["Durée"] || {};
              const invitesOpts = evt["Invités"] || {};

              const hasEvt =
                Object.keys(typeEvt).length ||
                Object.keys(dureeOpts).length ||
                Object.keys(invitesOpts).length ||
                dureeQty ||
                invitesQty;

              if (!hasEvt) return null;

              const parts = [];

              if (Object.keys(typeEvt).length) {
                parts.push(
                  <span key="evt-type">
                    {renderOptionList(typeEvt, "evt-type")}
                  </span>
                );
              }

              if (dureeQty && Object.keys(dureeOpts).length) {
                parts.push(
                  <span key="evt-duree">
                    {dureeQty}{" "}
                    {renderOptionList(dureeOpts, "evt-duree")}
                  </span>
                );
              }

              if (invitesQty && Object.keys(invitesOpts).length) {
                parts.push(
                  <span key="evt-invites">
                    {invitesQty}{" "}
                    {renderOptionList(invitesOpts, "evt-invites")}
                  </span>
                );
              }

              return (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-semibold text-slate-700 uppercase">
                    Événement
                  </h4>
                  <p className="ml-2 text-[11px]">
                    {parts.map((part, idx) => (
                      <span key={idx}>
                        {idx > 0 && ", "}
                        {part}
                      </span>
                    ))}
                  </p>
                </div>
              );
            })()}

            {/* Lieux & Aménagements */}
            {["lieux", "amenagements"].map((stepId) => {
              const stepSelections = selections[stepId];
              if (!stepSelections || !Object.keys(stepSelections).length)
                return null;

              return (
                <div key={stepId} className="space-y-1">
                  <h4 className="text-[11px] font-semibold text-slate-700 uppercase">
                    {config[stepId].title}
                  </h4>
                  {Object.entries(stepSelections).map(
                    ([groupLabel, opts]) => {
                      if (!Object.keys(opts || {}).length) return null;
                      return (
                        <div
                          key={groupLabel}
                          className="ml-2 space-y-0.5"
                        >
                          <p className="text-[11px] text-slate-500">
                            {groupLabel}
                          </p>
                          <p className="text-[11px]">
                            {renderOptionList(
                              opts,
                              stepId + "-" + groupLabel
                            )}
                          </p>
                        </div>
                      );
                    }
                  )}
                </div>
              );
            })}

            {/* Matériel / CTS */}
            {materielConfigs.some((conf, idx) =>
              buildCTSDescriptionText(conf, idx)
            ) && (
              <div className="space-y-1">
                <h4 className="text-[11px] font-semibold text-slate-700 uppercase">
                  Matériel (CTS)
                  {invitesQty ? (
                    <span className="font-normal text-[10px] text-slate-500 ml-1">
                      (~{Math.round(invitesQty * 1.2)} m²)
                    </span>
                  ) : null}
                </h4>
                {materielConfigs.map((conf, idx) =>
                  buildCTSDescriptionNode(conf, idx)
                )}
              </div>
            )}

            {/* Partenaires */}
            {selectedPartners.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-[11px] font-semibold text-slate-700 uppercase">
                  Partenaires
                </h4>
                {eventLocation && (
                  <p className="ml-2 text-[11px] text-slate-500">
                    📍 {eventLocation.label}
                  </p>
                )}
                {selectedPartners.map((p) => (
                  <div
                    key={p.id}
                    className="ml-2 flex items-center justify-between gap-2"
                  >
                    <p className="text-[11px]">
                      {p.statut === "Top Partenaire" ? (
                        <span className="font-semibold">{p.name}</span>
                      ) : (
                        p.name
                      )}
                      {p.ville && (
                        <span className="text-slate-500"> – {p.ville}</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => togglePartner(p)}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                      aria-label={`Retirer ${p.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!hasAnySelection && (
              <p className="text-xs text-slate-400 italic">
                Aucune sélection pour l’instant. Commence par cliquer sur
                quelques options pour générer un résumé.
              </p>
            )}
          </div>

          {/* Zone de prise de notes */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-700 mb-1">
              Notes complémentaires
            </p>
            <textarea
              className="w-full h-20 border border-slate-300 rounded-xl text-xs p-2 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-400"
              placeholder="Ajoute ici des précisions, contraintes ou remarques libres…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default QuoteConfigurator;