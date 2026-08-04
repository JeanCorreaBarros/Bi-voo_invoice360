"use client"

// Tabla comparativa multi-año para Balance General / Estado de Resultados,
// con la misma forma que un contador arma en Excel: cuentas PUC como filas
// jerárquicas (Clase > Grupo > Cuenta, o Clase > Corriente/No Corriente >
// Grupo > Cuenta) y un año por columna.

export type YearValues = Record<string, number>

export type ComparativeAccountRow = { accountId: string; code: string; name: string; values: YearValues }
export type ComparativeGroupRow = { code: string; name: string; values: YearValues; accounts: ComparativeAccountRow[] }
export type ComparativeBucket = { name: string; values: YearValues; groups: ComparativeGroupRow[] }

export type ComparativeSection = { code: string; name: string; values: YearValues; groups: ComparativeGroupRow[] }
export type ComparativeBucketSection = { code: string; name: string; values: YearValues; buckets: ComparativeBucket[] }

export type FlatRow = {
  key: string
  label: string
  code?: string
  indent: number
  bold?: boolean
  values: YearValues
  tone?: "default" | "success" | "danger" | "info"
}

export function flattenSection(section: ComparativeSection | null | undefined): FlatRow[] {
  if (!section) return []
  const rows: FlatRow[] = [
    { key: section.code, label: section.name, code: section.code, indent: 0, bold: true, values: section.values },
  ]
  for (const g of section.groups) {
    rows.push({ key: g.code, label: g.name, code: g.code, indent: 1, bold: true, values: g.values })
    for (const a of g.accounts) {
      rows.push({ key: a.accountId, label: a.name, code: a.code, indent: 2, values: a.values })
    }
  }
  return rows
}

export function flattenBucketSection(section: ComparativeBucketSection | null | undefined): FlatRow[] {
  if (!section) return []
  const rows: FlatRow[] = [
    { key: section.code, label: section.name, code: section.code, indent: 0, bold: true, values: section.values },
  ]
  for (const b of section.buckets) {
    if (b.groups.length === 0) continue
    rows.push({ key: `${section.code}-${b.name}`, label: b.name, indent: 1, bold: true, values: b.values })
    for (const g of b.groups) {
      rows.push({ key: g.code, label: g.name, code: g.code, indent: 2, bold: true, values: g.values })
      for (const a of g.accounts) {
        rows.push({ key: a.accountId, label: a.name, code: a.code, indent: 3, values: a.values })
      }
    }
  }
  return rows
}

export function ComparativeTable({
  years,
  rows,
  money,
}: {
  years: number[]
  rows: FlatRow[]
  money: (n: number) => string
}) {
  return (
    <div className="overflow-x-auto border border-gray-100 rounded-xl">
      <table className="w-full text-sm border-collapse min-w-max">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left px-4 py-2.5 font-bold text-gray-500 uppercase tracking-widest text-xs sticky left-0 bg-gray-50 z-10">
              Cuenta
            </th>
            {years.map((y) => (
              <th key={y} className="text-right px-4 py-2.5 font-bold text-gray-500 whitespace-nowrap">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={years.length + 1} className="px-4 py-6 text-center text-gray-400 text-sm">
                Sin movimientos en los años seleccionados
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.key}
                className={`border-t border-gray-50 ${r.bold ? "bg-gray-50/60 font-bold text-gray-900" : "text-gray-700"} ${
                  r.tone === "success"
                    ? "bg-green-50 text-green-700"
                    : r.tone === "danger"
                      ? "bg-red-50 text-red-600"
                      : r.tone === "info"
                        ? "bg-blue-50 text-blue-700"
                        : ""
                }`}
              >
                <td
                  className="px-4 py-2 whitespace-nowrap sticky left-0 bg-inherit"
                  style={{ paddingLeft: `${1 + r.indent * 1.25}rem` }}
                >
                  {r.code && <span className="font-mono text-gray-400 mr-2 text-xs">{r.code}</span>}
                  {r.label}
                </td>
                {years.map((y) => (
                  <td key={y} className="text-right px-4 py-2 whitespace-nowrap tabular-nums">
                    {money(r.values[y] ?? 0)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export function defaultYearRange(count = 5): { from: number; to: number } {
  const current = new Date().getFullYear()
  return { from: current - (count - 1), to: current }
}

export function yearsBetween(from: number, to: number): number[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) return []
  const years: number[] = []
  for (let y = from; y <= to; y++) years.push(y)
  return years
}
