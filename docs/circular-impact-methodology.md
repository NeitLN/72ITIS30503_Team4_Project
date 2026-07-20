# StyleHub Circular Impact Methodology

Methodology version: **1.0**
Phase: **13 — Circular Impact and Sustainability UVP**

StyleHub reports direct marketplace counts. It does not convert activity into carbon, CO2, water, waste, or other environmental estimates, and it does not assign environmental scores or certifications.

## Classification

The canonical Product Journey lifecycle types remain:

- `new`
- `deadstock`
- `pre_loved`
- `repaired`
- `upcycled`
- `not_specified`

The circular set is `deadstock`, `pre_loved`, `repaired`, and `upcycled`. `new` is a specified journey but is not circular. A missing Product Journey row, an unknown lifecycle value, and `not_specified` are treated as unspecified. Product Journey claims currently have the claim source `seller_declared`; StyleHub does not independently verify them.

## Active-listing metrics

All active metrics use only `products` rows where:

- `status = 'active'`; and
- `listing_source = 'user'`.

This excludes draft, hidden, sold, and archived listings and excludes the seed catalog. Phase 13 does not add or modify seed rows.

`activeUserListings` is the denominator: all rows in that active community-listing scope.

`activeJourneyListings` is the subset whose lifecycle is one of `new`, `deadstock`, `pre_loved`, `repaired`, or `upcycled`.

`journeyCoveragePercent` is:

```text
round_to_one_decimal(activeJourneyListings / activeUserListings × 100)
```

It is `0` when the denominator is zero.

`activeCircularListings` is the subset classified in the four-value circular set. `activeLifecycleBreakdown` reports the same circular total split by those four lifecycle types.

## Completed-unit metrics

Historical impact comes from `order_items`, not the current product row. An item contributes only when `fulfillment_status = 'completed'`; cancelled and in-progress items do not contribute. Counts sum `order_items.quantity`, so a completed line with quantity two contributes two units rather than one row.

The lifecycle comes from the immutable `lifecycle_type_snapshot` captured during checkout. Seller attribution comes from the immutable `seller_id` stored on the order item. Changing a product or Product Journey later can change active-listing metrics but cannot rewrite completed history. A completed seller item contributes even when another seller's item leaves the parent order in a different aggregate state.

`completedCircularUnits` is the platform total. `completedLifecycleBreakdown` splits it across the circular set.

## Scopes and privacy

The public platform endpoint returns platform aggregates only. The public seller endpoint returns only the seller's active circular listing count, active circular breakdown, and completed circular units sold. It does not return customer identities, purchases, orders, product identifiers, or raw rows.

The private profile endpoint derives identity only from the verified authentication token. Request query or body user IDs are ignored. It reports:

- the authenticated user's active listing coverage and circular listings;
- completed circular units sold using seller attribution snapshots; and
- completed circular units purchased using orders owned by that authenticated user.

Database reads for these aggregates use the trusted service-role client behind the backend route. Existing row-level security and table privileges continue to prevent anonymous clients from obtaining protected sustainability and order-item data directly.

## Response time semantics

Every impact response includes:

- `methodologyVersion: "1.0"`; and
- `generatedAt`, an ISO timestamp recorded when that response is calculated.

`generatedAt` is calculation time. It is not a guarantee that every underlying record was last updated at that instant. Phase 13 therefore does not publish `dataAsOf`.

## Limitations

- Product Journey is seller declared, not independently certified.
- Metrics describe recorded StyleHub marketplace activity only.
- Direct counts are not lifecycle assessments and should not be interpreted as avoided emissions, avoided water use, avoided waste, or net environmental benefit.
- The methodology intentionally makes no causal or environmental equivalency claim.
- The SDG 12 and SDG 8 references on the public page provide directional context only; they are not certification or quantified contributions.
