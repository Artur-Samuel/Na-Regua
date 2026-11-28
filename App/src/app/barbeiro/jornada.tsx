import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native"
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon } from "../../components/Icon"
import { PressableScale } from "../../components/PressableScale"
import { Aviso, Skeleton } from "../../components/ui"
import { getBarbeiroByUserId, getJornada, getUser, saveJornada } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { haptic } from "../../utils/haptics"

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const ORDEM = [1, 2, 3, 4, 5, 6, 0]   // exibe de segunda a domingo; diaSemana continua 0 = domingo

type FaixaHorario = {
  horaInicio: string
  horaFim: string
}

// Na tela o barbeiro informa o expediente e a PAUSA (ex.: 09–18 com intervalo 12–13).
// No banco continuam indo as faixas de trabalho (09–12 e 13–18): ver faixasDoDia().
type DiaSemana = {
  ativo: boolean
  inicio: string
  fim: string
  intervalo: { inicio: string; fim: string } | null
}

type Jornada = DiaSemana[]

function jornadaInicial(): Jornada {
  return Array.from({ length: 7 }, () => ({ ativo: false, inicio: "09:00", fim: "18:00", intervalo: null }))
}

/** Faixas de trabalho que vão para o servidor. */
function faixasDoDia(d: DiaSemana): FaixaHorario[] {
  return d.intervalo
    ? [{ horaInicio: d.inicio, horaFim: d.intervalo.inicio }, { horaInicio: d.intervalo.fim, horaFim: d.fim }]
    : [{ horaInicio: d.inicio, horaFim: d.fim }]
}

/** Faixas salvas (já ordenadas) → expediente + intervalo. */
function diaDasFaixas([a, b]: FaixaHorario[]): Omit<DiaSemana, "ativo"> {
  if (!b) return { inicio: a.horaInicio, fim: a.horaFim, intervalo: null }
  // Formato antigo: a 2ª faixa era a própria pausa, dentro da 1ª (ex.: 09–18 + 13–14)
  if (b.horaFim <= a.horaFim) return { inicio: a.horaInicio, fim: a.horaFim, intervalo: { inicio: b.horaInicio, fim: b.horaFim } }
  return { inicio: a.horaInicio, fim: b.horaFim, intervalo: { inicio: a.horaFim, fim: b.horaInicio } }
}

function validarHora(hora: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(hora)) return false
  const [h, m] = hora.split(":").map(Number)
  return h <= 23 && m <= 59
}

/** Só dígitos, com ":" inserido sozinho: "0930" → "09:30". */
function mascaraHora(texto: string) {
  const d = texto.replace(/\D/g, "").slice(0, 4)
  return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

function HoraInput({ label, value, onChange, invalida }: {
  label: string; value: string; onChange: (v: string) => void; invalida?: boolean
}) {
  const [foco, setFoco] = useState(false)
  return (
    <View style={f.horaGroup}>
      <Text style={f.horaLabel}>{label}</Text>
      <TextInput
        style={[f.horaInput, foco && f.horaFoco, invalida && f.horaErro]}
        value={value}
        onChangeText={(t) => onChange(mascaraHora(t))}
        onFocus={() => setFoco(true)}
        onBlur={() => setFoco(false)}
        placeholder="HH:MM"
        placeholderTextColor={C.subtle}
        keyboardType="number-pad"
        maxLength={5}
        selectTextOnFocus
        accessibilityLabel={label}
      />
    </View>
  )
}

const f = StyleSheet.create({
  horaGroup: { flex: 1, gap: 4 },
  horaLabel: { fontSize: 11, color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },
  horaInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: R.sm,
    height: 44, fontSize: 16, fontWeight: "700", color: C.text,
    backgroundColor: C.bg, textAlign: "center",
  },
  horaFoco: { borderColor: C.accent, backgroundColor: C.accentSoft },
  horaErro: { borderColor: C.error, backgroundColor: C.errorLight },
})

export default function Jornada() {
  const insets = useSafeAreaInsets()
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null)
  const [jornada, setJornada] = useState<Jornada>(jornadaInicial())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }

    try {
      // Funciona para dono e funcionário: busca o barbeiroId do próprio usuário
      const data = await getBarbeiroByUserId(user.id)
      if (data.status !== "success") return
      setBarbeiroId(data.barbeiro.barbeiroId)
      await carregarJornada(data.barbeiro.barbeiroId)
    } catch {
      setErro("Sem conexão com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  async function carregarJornada(id: number) {
    const data = await getJornada(id)
    if (data.status !== "success" || data.jornada.length === 0) return

    const nova = jornadaInicial()
    const porDia: Record<number, FaixaHorario[]> = {}

    for (const row of data.jornada) {
      const dia = parseInt(row.diaSemana)
      ;(porDia[dia] ??= []).push({ horaInicio: row.horaInicio.slice(0, 5), horaFim: row.horaFim.slice(0, 5) })
    }
    for (const [dia, faixas] of Object.entries(porDia)) {
      faixas.sort((x, y) => x.horaInicio.localeCompare(y.horaInicio))
      nova[Number(dia)] = { ativo: true, ...diaDasFaixas(faixas) }
    }
    setJornada(nova)
  }

  function alterar(fn: (j: Jornada) => Jornada) {
    setErro(null)
    setSalvo(false)
    setJornada(fn)
  }

  function toggleDia(dia: number) {
    haptic.leve()
    alterar((j) => {
      const nova = [...j]
      nova[dia] = { ...nova[dia], ativo: !nova[dia].ativo }
      return nova
    })
  }

  function atualizarHorario(dia: number, campo: "inicio" | "fim", valor: string) {
    alterar((j) => j.map((d, i) => (i === dia ? { ...d, [campo]: valor } : d)))
  }

  function atualizarIntervalo(dia: number, campo: "inicio" | "fim", valor: string) {
    alterar((j) => j.map((d, i) => (i === dia && d.intervalo ? { ...d, intervalo: { ...d.intervalo, [campo]: valor } } : d)))
  }

  function adicionarIntervalo(dia: number) {
    alterar((j) => j.map((d, i) => (i === dia ? { ...d, intervalo: { inicio: "12:00", fim: "13:00" } } : d)))
  }

  function removerIntervalo(dia: number) {
    alterar((j) => j.map((d, i) => (i === dia ? { ...d, intervalo: null } : d)))
  }

  /** Copia os horários de um dia para todos os outros dias ativos. */
  function copiarParaAtivos(origem: number) {
    haptic.toque()
    const { inicio, fim, intervalo } = jornada[origem]
    alterar((j) =>
      j.map((d, i) => (i !== origem && d.ativo ? { ...d, inicio, fim, intervalo: intervalo ? { ...intervalo } : null } : d))
    )
  }

  function horarioInvalido(inicio: string, fim: string) {
    return !validarHora(inicio) || !validarHora(fim) || fim <= inicio
  }

  /** Só marca em vermelho quando os dois campos já estão completos. */
  function marcar(inicio: string, fim: string) {
    return inicio.length === 5 && fim.length === 5 && horarioInvalido(inicio, fim)
  }

  function intervaloForaDoExpediente(d: DiaSemana) {
    return !!d.intervalo && (d.intervalo.inicio <= d.inicio || d.intervalo.fim >= d.fim)
  }

  /** Intervalo em vermelho: horário inválido ou fora do expediente (se o expediente estiver certo). */
  function marcarIntervalo(d: DiaSemana) {
    if (!d.intervalo || d.intervalo.inicio.length < 5 || d.intervalo.fim.length < 5) return false
    if (horarioInvalido(d.intervalo.inicio, d.intervalo.fim)) return true
    return !horarioInvalido(d.inicio, d.fim) && intervaloForaDoExpediente(d)
  }

  async function salvar() {
    if (!barbeiroId) return

    // Valida horas
    for (let dia = 0; dia < 7; dia++) {
      const d = jornada[dia]
      if (!d.ativo) continue
      const pares = d.intervalo ? [[d.inicio, d.fim], [d.intervalo.inicio, d.intervalo.fim]] : [[d.inicio, d.fim]]
      for (const [inicio, fim] of pares) {
        if (!validarHora(inicio) || !validarHora(fim)) {
          haptic.erro()
          setErro(`Horário inválido em ${DIAS[dia]}. Use o formato HH:MM.`)
          return
        }
        if (fim <= inicio) {
          haptic.erro()
          setErro(`Em ${DIAS[dia]}, o fim precisa ser depois do início.`)
          return
        }
      }
      if (intervaloForaDoExpediente(d)) {
        haptic.erro()
        setErro(`Em ${DIAS[dia]}, o intervalo precisa ficar dentro do horário de trabalho.`)
        return
      }
    }

    // Monta payload
    const jornadaPayload: { diaSemana: number; horaInicio: string; horaFim: string }[] = []
    for (let dia = 0; dia < 7; dia++) {
      if (!jornada[dia].ativo) continue
      for (const faixa of faixasDoDia(jornada[dia])) {
        jornadaPayload.push({ diaSemana: dia, horaInicio: faixa.horaInicio, horaFim: faixa.horaFim })
      }
    }

    setSaving(true)
    try {
      const data = await saveJornada({ barbeiroId, jornada: jornadaPayload })
      if (data.status === "success") {
        haptic.sucesso()
        setSalvo(true)
        setTimeout(() => router.back(), 700)
      } else {
        haptic.erro()
        setErro(data.message ?? "Não foi possível salvar. Tente novamente.")
      }
    } catch {
      setErro("Sem conexão com o servidor.")
    } finally {
      setSaving(false)
    }
  }

  const diasAtivos = jornada.filter((d) => d.ativo).length

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title="Minha jornada" subtitle={loading ? undefined : `${diasAtivos} dia${diasAtivos === 1 ? "" : "s"} de trabalho`} />

      {loading ? (
        <View style={s.scroll}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={74} radius={R.lg} style={{ marginBottom: 10 }} />)}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.hint}>
            Ative os dias que você trabalha e defina os horários. Use “Intervalo” para marcar a pausa do dia (ex.: almoço das 12:00 às 13:00).
          </Text>

          {ORDEM.map((diaIdx, i) => {
            const dia = jornada[diaIdx]
            return (
              <Animated.View
                key={diaIdx}
                entering={FadeInDown.delay(i * 40).duration(320)}
                layout={LinearTransition.springify().damping(20)}
                style={[s.diaCard, dia.ativo && s.diaCardAtivo]}
              >
                {/* Cabeçalho do dia */}
                <View style={s.diaHeader}>
                  <View style={[s.diaCircle, dia.ativo && { backgroundColor: C.accent, borderColor: C.accent }]}>
                    <Text style={[s.diaCircleText, dia.ativo && { color: "#FFF" }]}>{DIAS[diaIdx].slice(0, 3)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.diaNome}>{DIAS[diaIdx]}</Text>
                    <Text style={s.diaResumo}>
                      {!dia.ativo
                        ? "Folga"
                        : `${dia.inicio}–${dia.fim}${dia.intervalo ? `  ·  intervalo ${dia.intervalo.inicio}–${dia.intervalo.fim}` : ""}`}
                    </Text>
                  </View>
                  <Switch
                    value={dia.ativo}
                    onValueChange={() => toggleDia(diaIdx)}
                    trackColor={{ false: C.border, true: C.accentLight }}
                    thumbColor={dia.ativo ? C.accent : "#FFF"}
                    accessibilityLabel={`Trabalho na ${DIAS[diaIdx]}`}
                  />
                </View>

                {/* Faixas de horário */}
                {dia.ativo && (
                  <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={s.faixasContainer}>
                    <View style={s.faixaRow}>
                      <HoraInput
                        label="Início"
                        value={dia.inicio}
                        invalida={marcar(dia.inicio, dia.fim)}
                        onChange={(v) => atualizarHorario(diaIdx, "inicio", v)}
                      />
                      <Icon name="arrow-forward" size={16} color={C.subtle} />
                      <HoraInput
                        label="Fim"
                        value={dia.fim}
                        invalida={marcar(dia.inicio, dia.fim)}
                        onChange={(v) => atualizarHorario(diaIdx, "fim", v)}
                      />
                    </View>

                    {dia.intervalo ? (
                      <Animated.View
                        entering={FadeInDown.duration(220)}
                        exiting={FadeOut.duration(150)}
                        layout={LinearTransition.duration(200)}
                        style={s.faixaRow}
                      >
                        <HoraInput
                          label="Intervalo de"
                          value={dia.intervalo.inicio}
                          invalida={marcarIntervalo(dia)}
                          onChange={(v) => atualizarIntervalo(diaIdx, "inicio", v)}
                        />
                        <Icon name="arrow-forward" size={16} color={C.subtle} />
                        <HoraInput
                          label="Até"
                          value={dia.intervalo.fim}
                          invalida={marcarIntervalo(dia)}
                          onChange={(v) => atualizarIntervalo(diaIdx, "fim", v)}
                        />
                        <PressableScale
                          style={s.removeFaixaBtn}
                          onPress={() => removerIntervalo(diaIdx)}
                          scaleTo={0.85}
                          accessibilityLabel="Remover intervalo"
                        >
                          <Icon name="close" size={16} color={C.error} />
                        </PressableScale>
                      </Animated.View>
                    ) : null}

                    <View style={s.acoesDia}>
                      {!dia.intervalo && (
                        <PressableScale style={s.chip} onPress={() => adicionarIntervalo(diaIdx)} scaleTo={0.94}>
                          <Icon name="add" size={14} color={C.accent} />
                          <Text style={s.chipText}>Intervalo</Text>
                        </PressableScale>
                      )}
                      {diasAtivos > 1 && (
                        <PressableScale style={s.chip} onPress={() => copiarParaAtivos(diaIdx)} scaleTo={0.94}>
                          <Icon name="copy-outline" size={14} color={C.accent} />
                          <Text style={s.chipText}>Copiar para os outros dias</Text>
                        </PressableScale>
                      )}
                    </View>
                  </Animated.View>
                )}
              </Animated.View>
            )
          })}
        </ScrollView>
      )}

      <View style={[s.footer, { paddingBottom: 12 + insets.bottom }]}>
        {erro ? (
          <Animated.View entering={FadeIn.duration(180)} style={{ marginBottom: 10 }}>
            <Aviso tipo="erro" icon="alert-circle" texto={erro} />
          </Animated.View>
        ) : null}
        <Button
          label={salvo ? "Jornada salva!" : "Salvar jornada"}
          icon={salvo ? "checkmark-circle" : "save-outline"}
          onPress={salvar}
          loading={saving}
          disabled={loading || salvo}
          style={salvo ? { backgroundColor: C.success, opacity: 1 } : undefined}
        />
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  hint: { fontSize: 13, color: C.muted, lineHeight: 20, marginBottom: 14 },

  diaCard: {
    backgroundColor: C.card, borderRadius: R.lg, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  diaCardAtivo: { borderColor: C.accentLight },
  diaHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  diaCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  diaCircleText: { fontSize: 12, fontWeight: "800", color: C.muted },
  diaNome: { fontSize: 15, fontWeight: "700", color: C.text },
  diaResumo: { fontSize: 12, color: C.muted, marginTop: 2 },

  faixasContainer: {
    paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  faixaRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  removeFaixaBtn: {
    width: 36, height: 44, borderRadius: R.sm,
    backgroundColor: C.errorLight, alignItems: "center", justifyContent: "center",
  },

  acoesDia: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, backgroundColor: C.accentLight,
  },
  chipText: { fontSize: 12, color: C.accentDark, fontWeight: "700" },

  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
})
