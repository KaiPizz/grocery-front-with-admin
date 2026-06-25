# Unit Price Backfill Dry Run

Generated: 2026-06-25T17:35:38.978Z
Channel: kenmito
Endpoint: https://zira-ai.com/graphql/storefront
Inspected products: 1784 / 1784
Mode: full catalog

This report is read-only. It computes candidate pricePerUnit/unitOfMeasure values but does not write them.

## Summary

| Status | Count |
| --- | ---: |
| skip_ambiguous | 5 |
| skip_existing | 1588 |
| skip_no_measure | 191 |

## Candidate Sample

| Product | SKU | Package | Price | Candidate unit price | Source |
| --- | --- | ---: | ---: | ---: | --- |

## Apply Safety Rules

- Apply only rows with `status=candidate` after human review.
- Do not apply ambiguous rows automatically.
- Re-run product metadata audit after applying candidates.

CSV detail report: docs/unit-price-backfill-dry-run.csv
