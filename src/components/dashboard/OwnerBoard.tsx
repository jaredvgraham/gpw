import { formatCurrency } from "@/lib/utils";
import { TRACKING_RELIABLE_LABEL, type OwnerSnapshot, type SourceRow } from "@/lib/owner-metrics";

function rate(row: SourceRow): string {
  if (row.booked === null || row.matchable === 0) return "—";
  return `${Math.round((row.booked / row.matchable) * 100)}%`;
}

function inquiryLine(row: SourceRow): string {
  if (row.booked === null && row.source === "Untracked") return "Jobs without a matched inquiry";
  if (row.inquiries === 0) return "Matched from an earlier inquiry";
  if (row.booked === null) {
    const noun = row.inquiries === 1 ? "inquiry" : "inquiries";
    return `${row.inquiries} ${noun} · no street yet`;
  }
  const booked = `${row.booked} booked of ${row.matchable} with a street`;
  if (row.inquiries === row.matchable) return booked;
  return `${row.inquiries} inquiries · ${booked}`;
}

function money(amount: number): string {
  return formatCurrency(amount);
}

export default function OwnerBoard({
  snapshot,
  leadsReady,
}: {
  snapshot: OwnerSnapshot | null;
  leadsReady: boolean;
}) {
  return (
    <section className="mb-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Owner view</h2>
        <p className="mt-1 text-sm text-gray-500">
          Inquiries include ads, Google, referral, and yard sign or truck. The booking rate uses leads with a street. Job totals are work on the calendar in this period.
        </p>
        {snapshot?.earlyTracking && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            These numbers can be misleading. Tracking implementation only started after {TRACKING_RELIABLE_LABEL}.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5 lg:items-start">
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm lg:col-span-3">
          <div className="border-b border-brand-border px-4 py-3 lg:px-5">
            <h3 className="text-base font-semibold text-brand-black">Where the work came from</h3>
          </div>

          {!leadsReady || !snapshot ? (
            <p className="px-4 py-8 text-sm text-gray-500 lg:px-5">Loading leads…</p>
          ) : snapshot.sources.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-500 lg:px-5">No leads or jobs in this period.</p>
          ) : (
            <>
              <div className="lg:hidden">
                {snapshot.sources.map((row) => (
                  <div key={row.source} className="border-b border-brand-border px-4 py-3.5 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-brand-black">{row.source}</p>
                        <p className="mt-0.5 text-sm text-gray-500">{inquiryLine(row)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold tabular-nums text-brand-black">{money(row.jobTotal)}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{money(row.collected)} collected</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-brand-gray/60 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-brand-black">Total</p>
                    <p className="text-xs text-gray-500">
                      {snapshot.inquiryTotal} inquiries · {snapshot.bookedTotal} booked of {snapshot.matchableTotal} with a street
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold tabular-nums text-brand-black">{money(snapshot.jobTotal)}</p>
                    <p className="text-xs text-gray-500">{money(snapshot.collectedTotal)} collected</p>
                  </div>
                </div>
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-brand-border text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Source</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Inquiries</th>
                      <th className="px-2 py-2.5 text-right font-semibold">With street</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Booked</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Rate</th>
                      <th className="px-2 py-2.5 text-right font-semibold">Job total</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.sources.map((row) => (
                      <tr key={row.source} className="border-b border-brand-border/80 last:border-b-0">
                        <td className="px-4 py-2.5 font-medium text-brand-black">{row.source}</td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-700">
                          {row.source === "Untracked" ? "—" : row.inquiries}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-700">
                          {row.source === "Untracked" ? "—" : row.matchable}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-700">
                          {row.booked === null ? "—" : row.booked}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-gray-700">{rate(row)}</td>
                        <td className="px-2 py-2.5 text-right font-medium tabular-nums text-brand-black">
                          {money(row.jobTotal)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{money(row.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-brand-gray/50 text-sm font-semibold text-brand-black">
                    <tr>
                      <td className="px-4 py-2.5">Total</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{snapshot.inquiryTotal}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{snapshot.matchableTotal}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{snapshot.bookedTotal}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {snapshot.matchableTotal > 0
                          ? `${Math.round((snapshot.bookedTotal / snapshot.matchableTotal) * 100)}%`
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{money(snapshot.jobTotal)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money(snapshot.collectedTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-brand-border px-4 py-3 lg:px-5">
            <h3 className="text-base font-semibold text-brand-black">Expenses</h3>
          </div>
          <div className="px-4 py-2 lg:px-5">
            {!snapshot ? (
              <p className="py-6 text-sm text-gray-500">Loading expenses…</p>
            ) : (
              snapshot.expensesByType.map((slice) => {
                const max = Math.max(...snapshot.expensesByType.map((item) => item.amount), 1);
                return (
                  <div key={slice.type} className="border-b border-brand-border/70 py-3 last:border-b-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-gray-800">{slice.type}</p>
                      <p className="text-sm font-bold tabular-nums text-brand-black">{money(slice.amount)}</p>
                    </div>
                    <div className="mt-2 hidden h-1.5 overflow-hidden rounded-full bg-brand-gray lg:block">
                      <div
                        className="h-full rounded-full bg-brand-blue"
                        style={{ width: `${(slice.amount / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {snapshot && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-brand-border bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Ad spend</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-black">{money(snapshot.adSpend)}</p>
            <p className="mt-1 text-sm leading-snug text-gray-600">
              {money(snapshot.adRevenue)} from Facebook, Instagram, and Google jobs
            </p>
          </article>
          <article className="rounded-2xl border border-brand-border bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Gas and bleach</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-black">{money(snapshot.materials)}</p>
            <p className="mt-1 text-sm leading-snug text-gray-600">
              {snapshot.materialsPerJob === null
                ? "No completed jobs in this period"
                : `${money(snapshot.materialsPerJob)} per completed job · ${snapshot.completedJobs} completed`}
            </p>
          </article>
          <article className="rounded-2xl border border-brand-border bg-white px-4 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Houses</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-brand-black">
              {snapshot.firstTimeJobs}
              <span className="text-base font-semibold text-gray-400"> new</span>
            </p>
            <p className="mt-1 text-sm leading-snug text-gray-600">
              {snapshot.repeatJobs} repeat · {money(snapshot.firstTimeRevenue)} first-time,{" "}
              {money(snapshot.repeatRevenue)} coming back
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
