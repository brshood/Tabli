import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Loader2, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatGSTDateTime } from '../utils/dateFormat';

interface GuestHistoryProps {
  restaurantId: string;
  token: string;
}

type HistoryItem = {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  partySize?: number;
  mode?: string;
  reservationType?: string;
  status: string;
  seatingPreference?: string;
  requestedAt?: string;
  calledAt?: string;
  seatedAt?: string;
  leftAt?: string;
  cancellationReason?: string;
  customerNotes?: string;
};

const PAGE_SIZE = 25;
const EXPORT_PAGE_SIZE = 100;
const EXPORT_MAX_ROWS = 5000;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'seated', label: 'Seated' },
  { value: 'cancelled', label: 'Cancelled / expired' },
  { value: 'no_show', label: 'No-show' },
  { value: 'pending', label: 'Waiting' },
  { value: 'confirmed', label: 'Confirmed' },
];

const STATUS_LABELS: Record<string, string> = {
  seated: 'Seated',
  cancelled: 'Cancelled',
  no_show: 'No-show',
  pending: 'Waiting',
  confirmed: 'Confirmed',
};

const REASON_LABELS: Record<string, string> = {
  user_cancelled: 'Cancelled by guest',
  daily_reset: 'Expired (queue cleanup)',
  no_show: 'No-show',
  hold_expired: 'Hold expired',
  staff_removed: 'Removed by staff',
  called_list_expired: 'Called list expired',
  called_list_cleared: 'Called list cleared',
};

// YYYY-MM-DD for a date as seen in GST (UTC+4), matching how the server reads it
const gstDateInput = (d: Date): string =>
  new Date(d.getTime() + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);

const isRealPhone = (phone?: string) => !!phone && phone !== '0000000000';

const csvCell = (value: unknown): string => {
  let s = value == null ? '' : String(value);
  // Stop spreadsheet apps from running guest-entered text as a formula (plain phone
  // numbers such as +971501234567 are left untouched)
  if (/^[=+\-@\t\r]/.test(s) && !/^\+?[\d\s()-]+$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const guestType = (r: HistoryItem) =>
  r.reservationType === 'reserved' || (!r.reservationType && r.mode === 'reserve')
    ? 'Table reservation'
    : 'Waitlist';

const outcome = (r: HistoryItem) =>
  (r.status === 'cancelled' && r.cancellationReason && REASON_LABELS[r.cancellationReason]) ||
  STATUS_LABELS[r.status] ||
  r.status;

/**
 * Past waitlist entries and table reservations, including guests who were seated,
 * cancelled, expired or marked no-show and so no longer appear on the live board.
 */
export function GuestHistory({ restaurantId, token }: GuestHistoryProps) {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => gstDateInput(new Date(today.getTime() - 29 * 86400000)));
  const [to, setTo] = useState(() => gstDateInput(today));
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [from, to, status, debouncedSearch]);

  const buildUrl = (pageNum: number, limit: number) => {
    const params = new URLSearchParams({ page: String(pageNum), limit: String(limit) });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status) params.set('status', status);
    if (debouncedSearch) params.set('q', debouncedSearch);
    return `${API_URL}/reservations/history?${params.toString()}`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildUrl(page, PAGE_SIZE), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, restaurantId, token, from, to, status, debouncedSearch, page]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: HistoryItem[] = [];
      for (let p = 1; rows.length < EXPORT_MAX_ROWS; p++) {
        const res = await fetch(buildUrl(p, EXPORT_PAGE_SIZE), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const data = await res.json();
        rows.push(...(data.items || []));
        if (rows.length >= (data.total || 0) || !(data.items || []).length) break;
      }
      const header = ['Name', 'Phone', 'Email', 'Party size', 'Type', 'Seating', 'Outcome', 'Joined', 'Called', 'Seated', 'Left', 'Notes'];
      const dt = (v?: string) => (v ? formatGSTDateTime(v) : '');
      const lines = [header.map(csvCell).join(',')].concat(
        rows.map((r) =>
          [
            r.name,
            isRealPhone(r.phone) ? r.phone : '',
            r.email,
            r.partySize,
            guestType(r),
            r.seatingPreference,
            outcome(r),
            dt(r.requestedAt),
            dt(r.calledAt),
            dt(r.seatedAt),
            dt(r.leftAt),
            r.customerNotes,
          ].map(csvCell).join(',')
        )
      );
      const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `guest-history-${from || 'start'}_to_${to || 'today'}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} guest${rows.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card className="card-shadow border-0 rounded-3xl">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-2xl" style={{ color: '#2D2D2B' }}>
            Guest history ({total})
          </CardTitle>
          <Button
            variant="outline"
            className="pill-button"
            onClick={exportCsv}
            disabled={exporting || total === 0}
          >
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export CSV
          </Button>
        </div>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>
          Every past waitlist entry and table reservation, with the contact details guests gave. Newest first.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm space-y-1">
            <span style={{ color: '#5A5E3E' }}>From</span>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-sm space-y-1">
            <span style={{ color: '#5A5E3E' }}>To</span>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="text-sm space-y-1">
            <span style={{ color: '#5A5E3E' }}>Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              style={{ borderColor: 'rgba(90, 94, 62, 0.3)' }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span style={{ color: '#5A5E3E' }}>Search name, phone or email</span>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 opacity-50" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" />
            </div>
          </label>
        </div>

        {error && (
          <p className="text-sm rounded-lg p-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#B91C1C' }}>
            {error}
          </p>
        )}

        <div className="space-y-3 min-h-[120px]">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : items.length === 0 && !error ? (
            <p className="text-sm text-center py-10" style={{ color: '#9FA0A0' }}>
              No guests found for these filters.
            </p>
          ) : (
            items.map((r) => (
              <div
                key={r._id}
                className="rounded-2xl p-4 border"
                style={{ backgroundColor: '#FAF8F2', borderColor: 'rgba(90, 94, 62, 0.2)', opacity: loading ? 0.6 : 1 }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold" style={{ color: '#2D2D2B' }}>
                    {r.name?.trim() || 'Guest'}
                    <span className="font-normal text-sm ml-2" style={{ color: '#5A5E3E' }}>
                      Party of {r.partySize ?? '—'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#B889A6', color: '#fff' }}>
                      {guestType(r)}
                    </Badge>
                    <Badge
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: r.status === 'seated' ? '#3F4427' : '#9FA0A0', color: '#fff' }}
                    >
                      {outcome(r)}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm mt-1" style={{ color: '#2D2D2B' }}>
                  {[isRealPhone(r.phone) ? r.phone : '', r.email].filter(Boolean).join(' · ') || 'No contact info'}
                </div>
                <div className="text-xs mt-1" style={{ color: '#5A5E3E' }}>
                  Joined {r.requestedAt ? formatGSTDateTime(r.requestedAt) : '—'}
                  {r.seatedAt ? ` · Seated ${formatGSTDateTime(r.seatedAt)}` : ''}
                  {r.seatingPreference && r.seatingPreference !== 'no-preference' ? ` · ${r.seatingPreference}` : ''}
                </div>
                {r.customerNotes ? (
                  <p className="text-xs mt-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(184, 137, 166, 0.15)' }}>
                    <span className="font-medium">Note: </span>{r.customerNotes}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm" style={{ color: '#5A5E3E' }}>Page {page} of {pageCount}</span>
            <Button variant="outline" size="sm" disabled={page >= pageCount || loading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
