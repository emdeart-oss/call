"""Convertit le fichier Excel de la base partenaires en src/data/partners.json.

Usage : python3 scripts/import_partners.py chemin/vers/Base_Partenaire.xlsx
"""
import datetime
import json
import sys
from pathlib import Path

import openpyxl

OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "partners.json"

# Coordonnées manifestement erronées dans le fichier source (géocodage raté)
# ou absentes alors que l'adresse est connue.
COORD_FIXES = {
    "LOCATENTE NET": (16.2525, -61.2745),  # 97118 Saint-François, Guadeloupe
    "METALBOX": (44.7525, 10.2158),  # 43044 Collecchio, Italie
}


def to_coord(value):
    if value is None or value == "":
        return None
    # Excel a converti certaines longitudes (ex. "2.4101") en dates m.yyyy
    if isinstance(value, datetime.datetime):
        return float(f"{value.month}.{value.year}")
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return None


def clean(value):
    if value is None:
        return ""
    return str(value).strip()


def main(path):
    wb = openpyxl.load_workbook(path)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = [clean(h) for h in next(rows)]
    partners = []
    for row in rows:
        r = dict(zip(header, row))
        if not clean(r.get("name")):
            continue
        name = clean(r["name"])
        lat, lng = to_coord(r.get("lat")), to_coord(r.get("lng"))
        if name in COORD_FIXES:
            lat, lng = COORD_FIXES[name]
        partners.append(
            {
                "id": r.get("id"),
                "name": name,
                "number": clean(r.get("number")),
                "statut": clean(r.get("statut")) or "Partenaire potentiel",
                "adresseEntrepot": clean(r.get("adresseEntrepot")),
                "siteInternet": clean(r.get("siteInternet")),
                "adresse": clean(r.get("adresse")),
                "codePostal": clean(r.get("codePostal")),
                "ville": clean(r.get("ville")),
                "domaines": [d.strip() for d in clean(r.get("domaineActivite")).split("|") if d.strip()],
                "materiel": clean(r.get("materiel")),
                "lat": lat,
                "lng": lng,
            }
        )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(partners, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    geo = sum(1 for p in partners if p["lat"] is not None)
    print(f"{len(partners)} partenaires exportés ({geo} géolocalisés) -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
