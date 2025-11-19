# Admin API Performance Audit

Date: 2025-11-19

## High-Volume Endpoints

### `GET /admin/restaurants`
- Returns every restaurant document plus counts from `Reservation`, `Rating`, `Table`, `User`.
- Response size grows linearly with restaurant count (currently no pagination).
- Mongo runs four aggregations with `$match: { restaurantId: { $in: ids } }`; no projection to limit restaurant fields.

### `GET /admin/restaurants/:id`
- Fetches full restaurant document plus:
  - Up to 100 reservations (hard limit) sorted by `requestedAt`.
  - All ratings, tables, and users (no limits).
- Each array includes entire document; no projection fields removed.
- Frontend renders all arrays at once (no paging/virtualization).

## Identified Gaps
| Area | Finding |
| --- | --- |
| Pagination | Missing for list endpoints and detail sub-resources (reservations, ratings, tables, users). |
| Payload size | All fields returned; `lean()` used but no projection, so unused props are sent. |
| Index coverage | `Reservation` has `restaurantId+status` and `tableId` indexes. `Rating` indexes `restaurantId`. `Table` indexes `restaurantId+status`. Need composite indexes for date sorting (`requestedAt`, `createdAt`). |
| Client caching | `src/services/adminApi.ts` always refetches; no caching or background refresh. |
| Tabs | All tabs fetch/render simultaneously; no lazy load or virtualization. |
| Background jobs | Emails, summaries handled inline; no queue/worker separation. |
| Rate limits/healthchecks | Admin routes rely on default `express-rate-limit`? (none). No `/health` endpoint. |

## Recommendations (Input for Subsequent Tasks)
1. Add query params (`page`, `limit`, `sort`) to admin endpoints and enforce limits in Mongo queries.
2. Use projections (`.select`) to return only fields needed per view.
3. Create compound indexes:
   - `Reservation`: `{ restaurantId: 1, requestedAt: -1 }`.
   - `Rating`: `{ restaurantId: 1, createdAt: -1 }`.
   - `Table`: `{ restaurantId: 1, status: 1 }` already exists; consider `{ restaurantId: 1, name: 1 }`.
4. Implement React Query caching/lazy fetch per tab.
5. Introduce BullMQ worker for heavy jobs.
6. Add rate limiting middleware + `/health` route for monitoring.

