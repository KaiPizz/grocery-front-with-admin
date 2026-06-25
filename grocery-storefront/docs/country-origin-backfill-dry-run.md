# Country Origin Backfill Dry Run

Generated: 2026-06-25T18:41:40.808Z
Channel: kenmito
Endpoint: https://zira-ai.com/graphql/storefront
Source: https://kimchi.pl/product-pol-{id}.html
Catalog total: 1784
Missing countryOfOrigin inspected: 90

This is a read-only dry-run report. It does not mutate production data.

## Summary

| Decision | Count |
| --- | ---: |
| update_candidate | 1 |
| skip_missing_source_country | 63 |
| skip_multi_country | 23 |
| skip_no_kimchi_id | 0 |
| skip_fetch_error | 3 |

## Update Candidates

| SKU | Product | Candidate | Source |
| --- | --- | --- | --- |
| KIMCHI-2602 | Sos sojowy - mniej soli, długo warzony 150ml - Sen Soy | Japonia | https://kimchi.pl/product-pol-2602.html |

## Notes

- Only exact `Kraj pochodzenia` trait values from kimchi.pl are used.
- Non-country source tags such as WNP are ignored.
- Products with multiple remaining country values are left for manual review.

CSV detail report: docs/country-origin-backfill-dry-run.csv
