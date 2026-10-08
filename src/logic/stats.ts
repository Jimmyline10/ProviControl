/* Funciones estadísticas descriptivas usadas por la interpretación ejecutiva. */

export const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null)

/** Desviación estándar muestral (n − 1). */
export function sd(a: number[]) {
  if (a.length < 2) return null
  const m = mean(a)!
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1))
}

/** Percentil por interpolación lineal (p entre 0 y 100). */
export function percentile(a: number[], p: number) {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y), i = (p / 100) * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i)
  return s[lo] + (s[hi] - s[lo]) * (i - lo)
}
export const median = (a: number[]) => percentile(a, 50)

/** Coeficiente de variación en %. */
export function cv(a: number[]) {
  const m = mean(a), s = sd(a)
  return m && s != null ? (s / m) * 100 : null
}

/** Intervalo de confianza de Wilson al 95% para una proporción x/n, en %. */
export function wilson(x: number, n: number, z = 1.96): [number, number] | null {
  if (n <= 0) return null
  const p = x / n, z2 = z * z, d = 1 + z2 / n
  const c = p + z2 / (2 * n), m = z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))
  return [Math.max(0, Math.round(((c - m) / d) * 100)), Math.min(100, Math.round(((c + m) / d) * 100))]
}

/** IC 95% de una media (aproximación normal). */
export function meanCI(a: number[]): [number, number] | null {
  const m = mean(a), s = sd(a)
  if (m == null || s == null) return null
  const e = 1.96 * (s / Math.sqrt(a.length))
  return [Math.max(0, Math.round(m - e)), Math.round(m + e)]
}

/** Pendiente de la recta de mínimos cuadrados (unidades por periodo). */
export function slope(y: number[]) {
  if (y.length < 3) return null
  const n = y.length, mx = (n - 1) / 2, my = mean(y)!
  let num = 0, den = 0
  y.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) ** 2 })
  return den ? num / den : null
}

export const r1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10)
