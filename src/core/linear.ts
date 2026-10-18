/** Scaled partial-pivot elimination. Null means no reliable unique finite solution. */
export function linearSolve(matrix: number[][], rhs: number[]): number[] | null {
  const a = matrix.map((row, i) => [...row, rhs[i]])
  const scales = matrix.map((row) => Math.max(...row.map(Math.abs)))
  for (let col = 0; col < rhs.length; col++) {
    let pivot = col
    for (let row = col + 1; row < rhs.length; row++) {
      if (
        Math.abs(a[row][col]) / (scales[row] || 1) >
        Math.abs(a[pivot][col]) / (scales[pivot] || 1)
      )
        pivot = row
    }
    if (!scales[pivot] || Math.abs(a[pivot][col]) / scales[pivot] < 1e-12) return null
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    ;[scales[col], scales[pivot]] = [scales[pivot], scales[col]]
    for (let row = col + 1; row < rhs.length; row++) {
      const factor = a[row][col] / a[col][col]
      a[row][col] = 0
      for (let j = col + 1; j <= rhs.length; j++) a[row][j] -= factor * a[col][j]
    }
  }
  const x = Array<number>(rhs.length).fill(0)
  for (let i = rhs.length - 1; i >= 0; i--)
    x[i] =
      (a[i][rhs.length] -
        a[i].slice(i + 1, rhs.length).reduce((s, v, j) => s + v * x[i + 1 + j], 0)) /
      a[i][i]
  return x.every(Number.isFinite) ? x : null
}
