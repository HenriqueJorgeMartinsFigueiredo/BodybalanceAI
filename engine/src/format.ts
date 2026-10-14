/** Formata números para mensagens em pt-BR (vírgula decimal, ponto de milhar). */
export function fmt(x: number, maxDecimals = 2): string {
  return x.toLocaleString("pt-BR", { maximumFractionDigits: maxDecimals });
}
