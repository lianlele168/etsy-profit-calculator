# Etsy Fee Calculator Development Status

Updated: 2026-06-26

## Positioning

Build a credible Etsy seller profit decision tool, not a generic fee calculator clone.

Primary page angle:

- Etsy Fee & Profit Calculator
- With Offsite Ads
- With target-margin price recommendation
- With free shipping comparison

## Phase 1 Checklist

- [x] Single-page calculator
- [x] US seller fee profile
- [x] Offsite Ads support
- [x] Net profit and profit margin
- [x] Fee breakdown
- [x] Basic SEO tags
- [x] Compliance pages
- [x] Non-affiliation disclaimer

## Phase 2 Checklist

- [x] Reverse pricing for target margin
- [x] Free shipping comparison
- [x] Multi-country fee profiles
- [x] Official source links
- [x] Rate update date
- [x] Estimate disclaimer
- [x] FAQ section
- [x] Initial content cluster
- [x] Expand `How Much Does Etsy Take Per Sale?`
- [x] Expand `Etsy Offsite Ads Fee Explained`
- [x] Expand `Etsy Fees on Shipping`
- [ ] Expand blog posts with original examples and screenshots
- [ ] Add full country fee table
- [x] Add regulatory operating fee details for current supported country profiles
- [ ] Add regulatory operating fee details for all affected countries

## UI Prototype

- [x] Add throwaway `prototype.html` UI comparison page
- [x] Variant A: profit cockpit
- [x] Variant B: seller worksheet
- [x] Variant C: guided pricing flow
- [x] Add direct open files: `prototype-a.html`, `prototype-b.html`, `prototype-c.html`
- [x] Pick winning layout: A result impact + B worksheet structure
- [x] Fold winning layout into production `index.html`
- [x] Delete prototype-only files after decision

## Design Review

- [x] Review initial production UI after prototype selection
- [x] Fix result panel sticky overlap
- [x] Add safer desktop breakpoint to prevent three-column overflow
- [x] Reduce decorative card styling in hero and recommendation surfaces
- [x] Group mobile inputs by seller task: fee profile, sale details, costs, ads risk
- [x] Increase mobile touch target comfort for inputs and buttons
- [ ] Visual screenshot pass in browser
- [ ] Mobile interaction pass

## Phase 3 Backlog

- [x] Add Standard / POD seller mode structure
- [x] Keep POD mode progressive: no extra default fields
- [x] Add POD-only extra cost field that affects profit and target pricing
- [x] Add calculation test matrix for countries, input edge cases, Offsite Ads, POD, and target pricing
- [ ] Batch SKU calculator
- [ ] CSV import / export
- [ ] Shareable result link
- [ ] Local saved scenarios
- [ ] Email capture for spreadsheet template
- [ ] Affiliate recommendation module

## Before Publishing

- [x] Replace `https://example.com` with production Pages URL
- [x] Replace `hello@example.com` with monitored inbox
- [x] Re-check Etsy fee rates from official sources
- [x] Add Search Console verification
- [ ] Add analytics only after privacy review
- [ ] Add AdSense only after content expansion
