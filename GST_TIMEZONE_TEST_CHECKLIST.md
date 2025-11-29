# GST Timezone Testing Checklist

This document outlines the comprehensive testing plan to verify all date/time operations use GST timezone (Asia/Dubai, UTC+4) correctly.

## Test Environment Setup

**Important**: Ensure the server is running and connected to a test database.

**Current Timezone**: All tests should verify that times are displayed/calculated in GST (UTC+4)

---

## ✅ Backend Date/Time Operations

### 1. Peak Hours Calculation
**Endpoint**: `GET /analytics/peak-hours?restaurantId=<id>&range=day`

**Test Cases**:
- [ ] Create a reservation seated at 4:00 PM GST
- [ ] Verify peak hours endpoint shows hour 16 (4 PM) with count = 1
- [ ] Create another reservation seated at 4:30 PM GST
- [ ] Verify hour 16 still shows count = 2 (both customers present during 4-5 PM hour)
- [ ] Create reservation at 11:00 PM GST - verify hour 23 shows correctly
- [ ] Create reservation at 12:00 AM GST (midnight) - verify hour 0 shows correctly
- [ ] Test with `range=week` and `range=month` parameters

**Expected Behavior**: 
- Hours displayed (0-23) correspond to GST timezone
- If customer seated at 4 PM GST, hour 16 should have count

---

### 2. Date Range Queries (Today/Yesterday)
**Endpoints**: 
- `GET /analytics/overview?restaurantId=<id>&range=day`
- `GET /analytics/kpis?restaurantId=<id>`
- `GET /dashboard/<id>/summary`

**Test Cases**:
- [ ] Create reservation at 2:00 AM GST today
- [ ] Verify it appears in "today's" analytics (not yesterday)
- [ ] Create reservation at 11:30 PM GST yesterday
- [ ] Verify it appears in "yesterday's" analytics, not today
- [ ] Verify "today's start" is midnight GST (00:00:00 GST)
- [ ] Test around midnight GST boundary (11:59 PM vs 12:01 AM)

**Expected Behavior**:
- "Today" = from midnight GST (00:00:00) to now
- "Yesterday" = previous day in GST timezone
- Date boundaries respect GST timezone, not server local time

---

### 3. Daily Analytics Grouping
**Endpoint**: `GET /analytics/daily?restaurantId=<id>&range=week`

**Test Cases**:
- [ ] Create reservations on different days in GST timezone
- [ ] Verify reservations are grouped by GST date (not UTC date)
- [ ] Create reservation at 11:30 PM GST on Day 1
- [ ] Create reservation at 12:30 AM GST on Day 2
- [ ] Verify they appear in separate day groups

**Expected Behavior**:
- Reservations grouped by date in GST timezone
- Date boundaries at midnight GST (00:00:00 GST)

---

### 4. Date Parsing (API Input)
**Endpoints**: 
- `POST /analytics/daily-summary` (date in body)
- `GET /analytics/daily-summary/:date` (date in URL)

**Test Cases**:
- [ ] Send date as "2024-01-15" (YYYY-MM-DD format)
- [ ] Verify it's interpreted as midnight GST (2024-01-15T00:00:00+04:00)
- [ ] Send ISO date string
- [ ] Verify correct GST interpretation

**Expected Behavior**:
- YYYY-MM-DD format → parsed as midnight GST for that date
- All date queries use GST day boundaries

---

### 5. Wait Time Estimator
**Functionality**: Estimated wait times based on historical data

**Test Cases**:
- [ ] Verify historical data lookup uses GST date ranges
- [ ] Check that "today" vs "yesterday" calculations use GST boundaries
- [ ] Verify 30-day history window uses GST dates

**Expected Behavior**:
- Historical data grouped by GST dates
- Day boundaries respect GST timezone

---

## ✅ Frontend Date/Time Displays

### 6. Staff Dashboard
**Page**: Staff Dashboard - Waitlist & Seated Tables

**Test Cases**:
- [ ] Verify "Joined" time shows in GST (e.g., "4:00 PM" for 4 PM GST)
- [ ] Verify "Seated Time" shows in GST
- [ ] Verify "Hold Until" time shows in GST
- [ ] Verify "Called At" time shows in GST
- [ ] Check daily analytics chart dates use GST format

**Expected Behavior**:
- All times displayed in GST format
- Times match backend calculations

---

### 7. Admin Panel
**Page**: Admin Panel - Restaurant Details

**Test Cases**:
- [ ] Verify "Created" timestamp shows in GST
- [ ] Verify "Updated" timestamp shows in GST
- [ ] Verify reservation timestamps (requestedAt, confirmedAt, seatedAt, leftAt) show in GST
- [ ] Verify file upload timestamps show in GST
- [ ] Verify rating timestamps show in GST
- [ ] Verify user creation timestamps show in GST

**Expected Behavior**:
- All timestamps consistently formatted in GST
- Format: "Jan 15, 2024, 7:30 PM" in GST timezone

---

### 8. Notifications Page
**Page**: User Notifications/Reservation History

**Test Cases**:
- [ ] Verify booking date/time shows in GST
- [ ] Verify relative time ("2h ago") calculates from GST time
- [ ] Verify absolute dates use GST formatting

**Expected Behavior**:
- Date/time displays match GST timezone
- Relative times calculated from current GST time

---

### 9. Analytics Dashboard
**Page**: Analytics Dashboard (if used)

**Test Cases**:
- [ ] Verify "Today" date shows current GST date
- [ ] Verify chart date labels use GST dates
- [ ] Verify peak hours chart shows GST hours

**Expected Behavior**:
- All dates/times in GST format
- Charts align with backend data

---

## ✅ Cross-Timezone Consistency Tests

### 10. Server Timezone Independence
**Test**: Run server in different timezones

**Test Cases**:
- [ ] Server in UTC: Verify all times still show in GST
- [ ] Server in EST: Verify all times still show in GST
- [ ] Server in PST: Verify all times still show in GST

**Expected Behavior**:
- Server timezone does NOT affect displayed times
- All times consistently show in GST regardless of server location

---

### 11. Client Browser Timezone Independence
**Test**: Access from browsers in different timezones

**Test Cases**:
- [ ] Browser in EST: Verify times show in GST (not EST)
- [ ] Browser in PST: Verify times show in GST (not PST)
- [ ] Browser in GMT: Verify times show in GST (not GMT)

**Expected Behavior**:
- Browser timezone does NOT affect displayed times
- All times consistently show in GST

---

## ✅ Edge Cases

### 12. Midnight Boundary
**Test Cases**:
- [ ] Create reservation at 11:59:59 PM GST
- [ ] Create reservation at 12:00:01 AM GST (next day)
- [ ] Verify they appear on correct days

**Expected Behavior**:
- Midnight GST boundary handled correctly
- Day transitions at 00:00:00 GST

---

### 13. Day Boundary Queries
**Test Cases**:
- [ ] Query "today" at 12:00 AM GST (just after midnight)
- [ ] Query "today" at 11:59 PM GST (just before midnight)
- [ ] Verify correct date ranges returned

**Expected Behavior**:
- "Today" updates at midnight GST
- Queries respect GST day boundaries

---

### 14. Peak Hours Across Day Boundary
**Test Cases**:
- [ ] Customer seated at 11:00 PM GST, left at 1:00 AM GST (next day)
- [ ] Verify peak hours show:
  - Hour 23 (11 PM): count = 1
  - Hour 0 (midnight): count = 1
  - Hour 1 (1 AM): count = 0

**Expected Behavior**:
- Hours correctly calculated across day boundary
- Peak hours span midnight correctly

---

## ✅ Integration Tests

### 15. Full Flow Test
**Test Scenario**: Complete reservation flow with GST times

**Steps**:
1. [ ] Customer joins waitlist at 3:00 PM GST
2. [ ] Verify join time shows "3:00 PM" in dashboard
3. [ ] Customer seated at 3:45 PM GST
4. [ ] Verify seated time shows "3:45 PM"
5. [ ] Check peak hours - hour 15 (3 PM) should have count = 1
6. [ ] Customer left at 5:30 PM GST
7. [ ] Verify left time shows "5:30 PM"
8. [ ] Check peak hours - hours 15, 16, 17 should reflect presence

**Expected Behavior**:
- All timestamps consistent throughout flow
- Analytics reflect GST times accurately

---

## ✅ Performance Tests

### 16. Large Dataset
**Test Cases**:
- [ ] Query peak hours with 1000+ reservations
- [ ] Verify hour extraction performs well
- [ ] Verify date range queries are efficient

**Expected Behavior**:
- No performance degradation
- Accurate hour calculation regardless of dataset size

---

## Testing Tools

### Manual Testing
1. Use browser DevTools to change timezone (for client-side tests)
2. Use server environment variables to test different server timezones
3. Create test reservations via API with known timestamps

### Automated Testing (Recommended)
Create unit tests for:
- `getGSTHour()` function
- `getTodayStartGST()` function
- `formatGSTDateTime()` functions
- Date range calculations
- Peak hours hour extraction

---

## Known Issues to Watch For

1. **Date Object Internal Representation**: JavaScript Date objects are always UTC internally, but we format them for GST display
2. **Daylight Saving Time**: GST does not observe DST, so this should not be an issue
3. **Server vs Client Time Mismatch**: All times should show GST, regardless of server/client timezone

---

## Verification Commands

### Test Peak Hours API
```bash
curl "http://localhost:8080/analytics/peak-hours?restaurantId=<ID>&range=day"
# Check hour values (0-23) correspond to GST hours
```

### Test Date Parsing
```bash
curl -X POST "http://localhost:8080/analytics/daily-summary" \
  -H "Content-Type: application/json" \
  -d '{"restaurantId": "<ID>", "date": "2024-01-15"}'
# Verify date interpreted as 2024-01-15T00:00:00+04:00
```

---

## Success Criteria

✅ All tests pass
✅ Times consistently show in GST timezone
✅ Date boundaries respect GST midnight
✅ Peak hours accurately reflect GST hours
✅ No timezone-related discrepancies between backend and frontend
✅ Works correctly regardless of server/client timezone

---

## Test Results Template

```
Date: ___________
Tester: ___________
Environment: [ ] Local [ ] Staging [ ] Production

Backend Tests:
- [ ] Peak Hours Calculation: PASS / FAIL
- [ ] Date Range Queries: PASS / FAIL
- [ ] Daily Analytics: PASS / FAIL
- [ ] Date Parsing: PASS / FAIL

Frontend Tests:
- [ ] Staff Dashboard: PASS / FAIL
- [ ] Admin Panel: PASS / FAIL
- [ ] Notifications: PASS / FAIL

Edge Cases:
- [ ] Midnight Boundary: PASS / FAIL
- [ ] Day Transitions: PASS / FAIL

Notes:
_________________________________
_________________________________
```

