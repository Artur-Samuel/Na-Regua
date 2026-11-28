// src/app/barbeiro/financeiro.tsx
// Relatório financeiro do mês. Dono vê a barbearia inteira e cada barbeiro; funcionário vê só os próprios números.
// Faturamento = agendamentos concluídos (quem decide o escopo é o servidor, pelo token).
import { useEffect, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Header } from "../../components/Header"
import { Icon, IconName } from "../../components/Icon"
import { PressableScale } from "../../components/PressableScale"
import { Avatar, Badge, EmptyState, Skeleton } from "../../components/ui"
import { getRelatorioFinanceiro, RelatorioFinanceiro } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarMoeda, nomeMes, toISOMes } from "../../utils/format"

const ALTURA_GRAFICO = 120

const entrada = (i: number) => FadeInDown.delay(i * 60).duration(380)

/** "2026-11" + n meses → "2027-01" */
function somarMes(isoMes: string, n: number) {
  const [ano, mes] = isoMes.split("-").map(Number)
  return toISOMes(new Date(ano, mes - 1 + n, 1))
}

/** Valor curto para caber em cima da barra: 850 → "850", 1250 → "1,3k" */
function valorCurto(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k` : String(Math.round(v))
}

/* ── Gráfico de barras verticais (faturamento dos últimos 6 meses) ── */
function BarraVertical({ pct, ativa, ordem }: { pct: number; ativa: boolean; ordem: number }) {
  const h = useSharedValue(0)
  useEffect(() => {
    h.value = withDelay(100 + ordem * 50, withTiming(pct, { duration: 520 }))
  }, [pct])
  const anim = useAnimatedStyle(() => ({ height: Math.max(h.value * ALTURA_GRAFICO, 3) }))
  return <Animated.View style={[s.barraV, { backgroundColor: ativa ? C.accent : C.accentLight }, anim]} />
}

function GraficoMeses({ historico, mesAtivo, onSelecionar }: {
  historico: RelatorioFinanceiro["historico"]; mesAtivo: string; onSelecionar: (mes: string) => void
}) {
  const maior = Math.max(...historico.map((h) => h.faturamento), 1)
  return (
    <View style={s.grafico}>
      {historico.map((h, i) => {
        const ativa = h.mes === mesAtivo
        return (
          <PressableScale
            key={h.mes}
            style={s.coluna}
            scaleTo={0.94}
            onPress={() => onSelecionar(h.mes)}
            accessibilityRole="button"
            accessibilityLabel={`${nomeMes(h.mes)}: ${formatarMoeda(h.faturamento)}`}
          >
            <Text style={[s.colunaValor, ativa && { color: C.accent }]}>{h.faturamento ? valorCurto(h.faturamento) : ""}</Text>
            <View style={s.colunaBarra}>
              <BarraVertical pct={h.faturamento / maior} ativa={ativa} ordem={i} />
            </View>
            <Text style={[s.colunaMes, ativa && { color: C.text, fontWeight: "800" }]}>{nomeMes(h.mes, true)}</Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

/* ── Barra horizontal (ranking por barbeiro) ── */
function BarraHorizontal({ pct, ordem }: { pct: number; ordem: number }) {
  const w = useSharedValue(0)
  useEffect(() => {
    w.value = withDelay(150 + ordem * 60, withTiming(pct, { duration: 500 }))
  }, [pct])
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }))
  return (
    <View style={s.barraHFundo}>
      <Animated.View style={[s.barraHCheia, anim]} />
    </View>
  )
}

/* ── Barra empilhada de status (concluídos / confirmados / cancelados) ── */
function BarraStatus({ resumo }: { resumo: RelatorioFinanceiro["resumo"] }) {
  const partes = [
    { label: "Concluídos", qtd: resumo.concluidos, cor: C.success },
    { label: "Confirmados", qtd: resumo.confirmados, cor: C.accent },
    { label: "Cancelados", qtd: resumo.cancelados, cor: C.error },
  ]
  return (
    <>
      <View style={s.statusBarra}>
        {partes.filter((p) => p.qtd > 0).map((p) => (
          <View key={p.label} style={{ flex: p.qtd, backgroundColor: p.cor }} />
        ))}
      </View>
      <View style={s.legenda}>
        {partes.map((p) => (
          <View key={p.label} style={s.legendaItem}>
            <View style={[s.legendaPonto, { backgroundColor: p.cor }]} />
            <Text style={s.legendaQtd}>{p.qtd}</Text>
            <Text style={s.legendaLabel}>{p.label}</Text>
          </View>
        ))}
      </View>
    </>
  )
}

function MiniStat({ icon, label, value, cor }: { icon: IconName; label: string; value: string; cor: string }) {
  return (
    <View style={s.miniStat}>
      <View style={[s.miniIcon, { backgroundColor: cor + "1A" }]}>
        <Icon name={icon} size={16} color={cor} />
      </View>
      <Text style={s.miniValor}>{value}</Text>
      <Text style={s.miniLabel}>{label}</Text>
    </View>
  )
}

export default function Financeiro() {
  const insets = useSafeAreaInsets()
  const mesAtual = toISOMes(new Date())
  const [mes, setMes] = useState(mesAtual)
  const [rel, setRel] = useState<RelatorioFinanceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { carregar(mes) }, [mes])

  async function carregar(m: string) {
    try {
      const d = await getRelatorioFinanceiro(m)
      if (d.status !== "success") { setErro(d.message ?? "Erro ao carregar"); return }
      setRel(d)
      setErro(null)
    } catch {
      setErro("Sem conexão com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await carregar(mes)
    setRefreshing(false)
  }

  const souDono = rel?.escopo === "barbearia"
  const podeAvancar = mes < mesAtual
  const maiorBarbeiro = Math.max(...(rel?.barbeiros ?? []).map((b) => b.faturamento), 1)

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title="Financeiro" subtitle={rel ? (souDono ? "Barbearia" : "Seus números") : undefined} />

      {/* Seletor de mês */}
      <View style={s.seletor}>
        <PressableScale style={s.seta} scaleTo={0.9} onPress={() => setMes(somarMes(mes, -1))} accessibilityLabel="Mês anterior">
          <Icon name="chevron-back" size={18} color={C.text} />
        </PressableScale>
        <Text style={s.seletorTexto}>{nomeMes(mes)}</Text>
        <PressableScale
          style={[s.seta, !podeAvancar && { opacity: 0.35 }]}
          scaleTo={0.9}
          disabled={!podeAvancar}
          onPress={() => setMes(somarMes(mes, 1))}
          accessibilityLabel="Próximo mês"
        >
          <Icon name="chevron-forward" size={18} color={C.text} />
        </PressableScale>
      </View>

      {loading ? (
        <View style={s.scroll}>
          <Skeleton height={130} radius={R.lg} style={{ marginBottom: 12 }} />
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
            <Skeleton width="48.5%" height={90} radius={R.lg} />
            <Skeleton width="48.5%" height={90} radius={R.lg} />
          </View>
          <Skeleton height={200} radius={R.lg} />
        </View>
      ) : !rel ? (
        <EmptyState icon="cloud-offline-outline" title="Algo deu errado" text={erro ?? undefined} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} tintColor={C.accent} />}
        >
          {/* Faturamento (destaque) */}
          <Animated.View entering={entrada(0)} style={s.hero}>
            <View style={s.heroTopo}>
              <Icon name="cash-outline" size={16} color="rgba(255,255,255,0.7)" />
              <Text style={s.heroLabel}>Faturamento{souDono ? " da barbearia" : ""}</Text>
            </View>
            <Text style={s.heroValor}>{formatarMoeda(rel.resumo.faturamento)}</Text>
            <Text style={s.heroSub}>
              {rel.resumo.concluidos} atendimento{rel.resumo.concluidos === 1 ? "" : "s"} concluído{rel.resumo.concluidos === 1 ? "" : "s"}
            </Text>
          </Animated.View>

          <Animated.View entering={entrada(1)} style={s.miniRow}>
            <MiniStat icon="receipt-outline" label="Ticket médio" value={formatarMoeda(rel.resumo.ticketMedio)} cor={C.success} />
            <MiniStat icon="calendar-outline" label="Agendamentos no mês" value={String(rel.resumo.total)} cor={C.accent} />
          </Animated.View>

          {/* Últimos 6 meses */}
          <Animated.View entering={entrada(2)} style={s.card}>
            <Text style={s.cardTitulo}>Últimos 6 meses</Text>
            <Text style={s.cardSub}>Faturamento por mês · toque numa barra para ver o mês</Text>
            <GraficoMeses historico={rel.historico} mesAtivo={mes} onSelecionar={setMes} />
          </Animated.View>

          {/* Status dos agendamentos */}
          <Animated.View entering={entrada(3)} style={s.card}>
            <Text style={s.cardTitulo}>Agendamentos do mês</Text>
            {rel.resumo.total === 0 ? (
              <Text style={s.cardSub}>Nenhum agendamento em {nomeMes(mes).toLowerCase()}.</Text>
            ) : (
              <BarraStatus resumo={rel.resumo} />
            )}
          </Animated.View>

          {/* Por barbeiro (só o dono) */}
          {souDono && rel.barbeiros && (
            <Animated.View entering={entrada(4)} style={s.card}>
              <Text style={s.cardTitulo}>Por barbeiro</Text>
              {rel.barbeiros.map((b, i) => (
                <View key={b.barbeiroId} style={[s.barbeiro, i > 0 && s.barbeiroDivisor]}>
                  <View style={s.barbeiroTopo}>
                    <Avatar nome={b.nome} size={36} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={s.barbeiroNome} numberOfLines={1}>{b.nome}</Text>
                        {!b.naEquipe && <Badge label="saiu" cor={C.muted} fundo={C.border} />}
                      </View>
                      <Text style={s.barbeiroMeta}>
                        {b.concluidos} concluído{b.concluidos === 1 ? "" : "s"} · ticket {formatarMoeda(b.ticketMedio)}
                      </Text>
                    </View>
                    <Text style={s.barbeiroValor}>{formatarMoeda(b.faturamento)}</Text>
                  </View>
                  <BarraHorizontal pct={b.faturamento / maiorBarbeiro} ordem={i} />
                </View>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  seletor: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  seta: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  seletorTexto: { fontSize: 17, fontWeight: "800", color: C.text, letterSpacing: -0.3 },

  hero: { backgroundColor: C.text, borderRadius: R.lg + 4, padding: 18, marginBottom: 12, ...sombra(3) },
  heroTopo: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  heroValor: { fontSize: 34, fontWeight: "800", color: "#FFF", letterSpacing: -1, marginTop: 6 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  miniRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  miniStat: {
    flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 12, gap: 6,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  miniIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  miniValor: { fontSize: 20, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  miniLabel: { fontSize: 11, color: C.muted, fontWeight: "600" },

  card: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardTitulo: { fontSize: 16, fontWeight: "700", color: C.text },
  cardSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  grafico: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 16 },
  coluna: { flex: 1, alignItems: "center", gap: 6 },
  colunaValor: { fontSize: 10, fontWeight: "700", color: C.muted },
  colunaBarra: { height: ALTURA_GRAFICO, width: "100%", justifyContent: "flex-end" },
  barraV: { width: "100%", borderRadius: 6 },
  colunaMes: { fontSize: 11, color: C.muted, fontWeight: "600" },

  statusBarra: {
    flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden",
    backgroundColor: C.border, marginTop: 14, gap: 2,
  },
  legenda: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  legendaItem: { alignItems: "flex-start", gap: 2 },
  legendaPonto: { width: 8, height: 8, borderRadius: 4 },
  legendaQtd: { fontSize: 18, fontWeight: "800", color: C.text },
  legendaLabel: { fontSize: 11, color: C.muted },

  barbeiro: { paddingTop: 12, gap: 8 },
  barbeiroDivisor: { marginTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  barbeiroTopo: { flexDirection: "row", alignItems: "center", gap: 10 },
  barbeiroNome: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: C.text },
  barbeiroMeta: { fontSize: 11, color: C.muted, marginTop: 1 },
  barbeiroValor: { fontSize: 14, fontWeight: "800", color: C.text },
  barraHFundo: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: "hidden" },
  barraHCheia: { height: 8, borderRadius: 4, backgroundColor: C.accent },
})
