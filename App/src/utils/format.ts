// src/utils/format.ts
// Formatações repetidas em várias telas.

/** "2025-03-09" ou "2025-03-09 14:00:00" → "09/03/2025" */
export function formatarData(mysql?: string | null) {
  if (!mysql) return ""
  const [ano, mes, dia] = mysql.split(" ")[0].split("-")
  if (!ano || !mes || !dia) return ""
  return `${dia}/${mes}/${ano}`
}

export function formatarMoeda(valor: number | string) {
  return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`
}

/** Data local em YYYY-MM-DD (toISOString usa UTC e pode voltar um dia à noite). */
export function toISODate(d: Date) {
  const mes = String(d.getMonth() + 1).padStart(2, "0")
  const dia = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mes}-${dia}`
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

/** Mês local em YYYY-MM. */
export function toISOMes(d: Date) {
  return toISODate(d).slice(0, 7)
}

/** "2026-11" → "Novembro 2026" (curto: "Nov") */
export function nomeMes(isoMes: string, curto = false) {
  const [ano, mes] = isoMes.split("-").map(Number)
  const nome = MESES[mes - 1] ?? ""
  return curto ? nome.slice(0, 3) : `${nome} ${ano}`
}

export function primeiroNome(nome?: string | null) {
  return (nome ?? "").trim().split(" ")[0]
}
