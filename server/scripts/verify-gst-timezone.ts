/**
 * GST Timezone Verification Script
 * 
 * This script verifies that all date/time operations correctly use GST timezone (Asia/Dubai, UTC+4)
 * 
 * Usage: tsx scripts/verify-gst-timezone.ts
 */

import { 
  getGSTHour, 
  getTodayStartGST, 
  getYesterdayStartGST,
  getDaysAgoStartGST,
  formatGSTDateTime,
  formatGSTDateString,
  getGSTStartOfDay,
  getGSTEndOfDay,
  GST_TIMEZONE
} from '../src/utils/dateFormat';

console.log('='.repeat(60));
console.log('GST Timezone Verification Script');
console.log('Timezone: Asia/Dubai (UTC+4)');
console.log('='.repeat(60));
console.log('');

// Test 1: Verify GST timezone constant
console.log('✅ Test 1: GST Timezone Constant');
console.log(`   Expected: Asia/Dubai`);
console.log(`   Actual: ${GST_TIMEZONE}`);
console.log(`   Result: ${GST_TIMEZONE === 'Asia/Dubai' ? 'PASS' : 'FAIL'}`);
console.log('');

// Test 2: Verify getGSTHour function
console.log('✅ Test 2: getGSTHour() Function');
const now = new Date();
const gstHour = getGSTHour(now);
const utcHour = now.getUTCHours();
const expectedGSTHour = (utcHour + 4) % 24; // GST is UTC+4

console.log(`   Current UTC Time: ${now.toISOString()}`);
console.log(`   UTC Hour: ${utcHour}`);
console.log(`   GST Hour (calculated): ${expectedGSTHour}`);
console.log(`   GST Hour (function): ${gstHour}`);
console.log(`   Result: ${gstHour === expectedGSTHour ? 'PASS' : 'FAIL'}`);

// Test specific times
const testTimes = [
  { iso: '2024-01-15T16:00:00Z', description: '4:00 PM UTC', expectedGST: 20 }, // 4 PM UTC = 8 PM GST
  { iso: '2024-01-15T12:00:00Z', description: '12:00 PM UTC', expectedGST: 16 }, // 12 PM UTC = 4 PM GST
  { iso: '2024-01-15T20:00:00Z', description: '8:00 PM UTC', expectedGST: 0 }, // 8 PM UTC = 12 AM GST (next day)
];

for (const test of testTimes) {
  const date = new Date(test.iso);
  const hour = getGSTHour(date);
  const passed = hour === test.expectedGST;
  console.log(`   ${test.description}: Hour ${hour} (Expected: ${test.expectedGST}) ${passed ? '✓' : '✗'}`);
}
console.log('');

// Test 3: Verify getTodayStartGST
console.log('✅ Test 3: getTodayStartGST() Function');
const todayStart = getTodayStartGST();
const todayStartStr = formatGSTDateTime(todayStart);
console.log(`   Today Start (GST): ${todayStartStr}`);
console.log(`   ISO: ${todayStart.toISOString()}`);

// Verify it's at midnight GST
const gstHourAtStart = getGSTHour(todayStart);
const gstMinute = todayStart.toLocaleString('en-US', { 
  timeZone: GST_TIMEZONE, 
  minute: '2-digit',
  hour12: false 
});
console.log(`   GST Hour at start: ${gstHourAtStart} (Expected: 0)`);
console.log(`   GST Minute at start: ${parseInt(gstMinute)} (Expected: 0)`);
console.log(`   Result: ${gstHourAtStart === 0 && parseInt(gstMinute) === 0 ? 'PASS' : 'FAIL'}`);
console.log('');

// Test 4: Verify getYesterdayStartGST
console.log('✅ Test 4: getYesterdayStartGST() Function');
const yesterdayStart = getYesterdayStartGST();
const yesterdayStartStr = formatGSTDateTime(yesterdayStart);
console.log(`   Yesterday Start (GST): ${yesterdayStartStr}`);
console.log(`   ISO: ${yesterdayStart.toISOString()}`);

// Verify it's 24 hours before today start
const diffHours = (todayStart.getTime() - yesterdayStart.getTime()) / (1000 * 60 * 60);
console.log(`   Hours difference from today: ${diffHours} (Expected: ~24)`);
console.log(`   Result: ${Math.abs(diffHours - 24) < 1 ? 'PASS' : 'FAIL'}`);
console.log('');

// Test 5: Verify date formatting
console.log('✅ Test 5: Date Formatting Functions');
const testDate = new Date('2024-01-15T16:00:00Z'); // 4 PM UTC = 8 PM GST

console.log(`   Test Date (ISO): ${testDate.toISOString()}`);
console.log(`   formatGSTDateTime: ${formatGSTDateTime(testDate)}`);
console.log(`   formatGSTDateString: ${formatGSTDateString(testDate)}`);

// Verify the formatted date shows correct GST time
const gstDateTime = formatGSTDateTime(testDate);
const includesPM = gstDateTime.includes('PM');
console.log(`   Contains 'PM' (8 PM GST): ${includesPM ? '✓' : '✗'}`);
console.log('');

// Test 6: Verify day boundaries
console.log('✅ Test 6: Day Boundary Handling');
const dayStart = getGSTStartOfDay(testDate);
const dayEnd = getGSTEndOfDay(testDate);

console.log(`   Day Start (GST): ${formatGSTDateTime(dayStart)}`);
console.log(`   Day End (GST): ${formatGSTDateTime(dayEnd)}`);

const startHour = getGSTHour(dayStart);
const endHour = getGSTHour(dayEnd);
console.log(`   Start Hour: ${startHour} (Expected: 0)`);
console.log(`   End Hour: ${endHour} (Expected: 23)`);
console.log(`   Result: ${startHour === 0 && endHour === 23 ? 'PASS' : 'FAIL'}`);
console.log('');

// Test 7: Verify date range calculations
console.log('✅ Test 7: Date Range Calculations');
const daysAgo3 = getDaysAgoStartGST(3);
const daysAgo3Str = formatGSTDateTime(daysAgo3);
console.log(`   3 Days Ago Start: ${daysAgo3Str}`);

const diffDays = (todayStart.getTime() - daysAgo3.getTime()) / (1000 * 60 * 60 * 24);
console.log(`   Days difference from today: ${diffDays} (Expected: ~3)`);
console.log(`   Result: ${Math.abs(diffDays - 3) < 0.1 ? 'PASS' : 'FAIL'}`);
console.log('');

// Test 8: Peak hours hour extraction
console.log('✅ Test 8: Peak Hours Hour Extraction');
const peakHourTests = [
  { time: '2024-01-15T16:00:00+04:00', description: '4:00 PM GST', expected: 16 },
  { time: '2024-01-15T12:00:00+04:00', description: '12:00 PM GST', expected: 12 },
  { time: '2024-01-15T23:30:00+04:00', description: '11:30 PM GST', expected: 23 },
  { time: '2024-01-16T00:30:00+04:00', description: '12:30 AM GST', expected: 0 },
];

for (const test of peakHourTests) {
  const date = new Date(test.time);
  const hour = getGSTHour(date);
  const passed = hour === test.expected;
  console.log(`   ${test.description}: Hour ${hour} (Expected: ${test.expected}) ${passed ? '✓' : '✗'}`);
}
console.log('');

// Summary
console.log('='.repeat(60));
console.log('Verification Complete!');
console.log('='.repeat(60));
console.log('');
console.log('Next Steps:');
console.log('1. Review test results above');
console.log('2. Run manual tests using GST_TIMEZONE_TEST_CHECKLIST.md');
console.log('3. Test with actual API endpoints');
console.log('4. Verify frontend displays match backend calculations');
console.log('');

