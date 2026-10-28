# EPR packaging report data prep: SAMPLE deliverable (Oregon)

**All brand data in this folder is FICTIONAL** ("Ember & Fern Co.", invented SKUs, units and weights). It demonstrates the format only.

## What it is, and is not
- This is **data preparation, not legal advice.**
- **We do not decide whether a brand is exempt or obligated** under Oregon's packaging EPR law, or which items are covered.
- **The customer submits their own report** to the program administrator. We only prepare the numbers and list what we could not determine.

## What the customer gets
| File | Contents |
|---|---|
| `component-mapping.csv` | Each packaging component mapped to an Oregon material class and reporting category, with confidence (high/medium/low), a needs_customer_check flag and a reason |
| `totals-by-category.csv` | Total kg per reporting category, with a column showing kg that rests on unconfirmed mappings, and the arithmetic written out per row |
| `questions-for-customer.md` | Open questions to answer before the totals are relied on |
| `categories-oregon.csv` | The 60-category list used, verbatim, with source lines |

## Method
1. The customer lists SKUs, units sold into Oregon in the prior calendar year, and packaging components with gram weights (`sample-input.csv`).
2. Each component description is mapped to one category (`component-mapping.csv`). Where material, resin, coating or construction is unknown, the best guess is flagged, not hidden.
3. `make_sample.py` computes kg per category = sum of (units x grams per unit) / 1000 and checks that every mapping uses a category from the list and that nothing is unmapped. Run: `python3 -I make_sample.py`.

## Category list source and date
Oregon DEQ-hosted Circular Action Alliance (CAA) approved program plan, Table 19 "Reporting Category - Revised" (about pp. 191-194), https://www.oregon.gov/deq/recycling/Documents/CAAApprovedPlan.pdf, retrieved 2026-10-28. Table 19 applies to the 2025 and 2026 fee schedules; the plan says two categories split for 2027 fees. A DEQ one-page sheet (orsacFeeCategories.pdf) is an older variant. See `official-categories.md` for the recount (60 categories, 8 classes).

## Limits
- Mapping is from short seller descriptions; many rows are guesses until the customer confirms (about 43% of sample kg, 759 of 1,773 kg, rests on unconfirmed mappings).
- The rule text of OAR 340-090-0700 (weight basis, estimation) could NOT be retrieved, so the method is not verified against the rule. The customer should confirm the required weight basis and any small-format thresholds with the program administrator.
- The meaning of the asterisks in Table 19 is not explained in the extracted text.
- Colorado and other states are not covered.
