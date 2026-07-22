# ADG-000556 physical stock safety follow-up — 2026-07-22

## Catalog conclusion

`storageZone=AMBIENT` is supported and remains in batch 6. This metadata patch
does not change sale availability, inventory, identity, ingredients,
allergens, or nutrition.

The mapped consumer GTIN `6922163616734` identifies one Tian Hu Shan matcha
tin of 80 g. It does not prove the current storefront title's `80g x2` sale
unit, so both tins must be photographed before any further identity-specific
metadata is added.

## Historical recall boundary

EU RASFF notification `2022.4578` and the French government record identify a
lot-specific PAH recall:

- GTIN: `6922163616734`
- lot: `2022059217`
- DDM: `25/11/2024` (the Iceland notice records `24/11/2024`)
- reason: excessive benzo(a)pyrene and other PAHs
- distribution included Poland

The notice does not recall every later lot that reuses the GTIN. A current
same-GTIN listing carries a 2028 DDM, so neither the product name nor GTIN alone
proves that current stock is affected.

Primary records:

- EU RASFF: <https://webgate.ec.europa.eu/rasff-window/screen/notification?reference=2022.4578>
- French RappelConso: <https://rappel.conso.gouv.fr/fiche-rappel/7908/Interne>
- Iceland MAST: <https://www.mast.is/is/um-mast/frettir/innkallanir/adskotaefni-fannst-i-tedufti>

## Required warehouse action

Before fulfilment, photograph the EAN, lot, and DDM on both tins. Temporarily
hold fulfilment until this check is recorded. Quarantine only tins matching the
recalled lot/DDM or any expired stock; release a verified different, unexpired
lot. This operational check is intentionally separate from the metadata-only
batch.
