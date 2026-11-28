import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon, IconName } from "../../components/Icon"
import { PressableScale } from "../../components/PressableScale"
import { Avatar, Aviso, Badge, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import { createAgendamento, getBarbeirosByBarbearia, getServicos, getSlotsDisponiveis, getUser } from "../../services/api"
import { C, MOTION, R, sombra } from "../../theme"
import { formatarMoeda, toISODate } from "../../utils/format"
import { haptic } from "../../utils/haptics"

/* ─── Tipos ── */
type Barbeiro = {
  barbeiroId: number
  nome: string
  fotoPerfil: string | null
  especialidade: string | null
  souDono: boolean
}

type Servico = {
  servicoId: number
  nome: string
  preco: number
  duracaoMin: number
}

type Slot = {
  horaInicio: string
  horaFim: string
}

const PASSOS = ["Profissional", "Serviços", "Horário", "Confirmar"]
const DIAS_VISIVEIS = 21

/* ─── Helpers ── */
function formatarDataLonga(date: Date) {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })
}

function proximosDias(qtd: number) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje)
    d.setDate(hoje.getDate() + i)
    return d
  })
}

function mesmoDia(a: Date, b: Date) {
  return toISODate(a) === toISODate(b)
}

/* ─── Barra de progresso ── */
function Progresso({ atual }: { atual: number }) {
  const largura = useSharedValue((atual + 1) / PASSOS.length)
  useEffect(() => {
    largura.value = withTiming((atual + 1) / PASSOS.length, { duration: MOTION.normal })
  }, [atual])
  const barra = useAnimatedStyle(() => ({ width: `${largura.value * 100}%` }))

  return (
    <View style={pg.wrap}>
      <View style={pg.trilho}>
        <Animated.View style={[pg.barra, barra]} />
      </View>
      <View style={pg.labels}>
        {PASSOS.map((p, i) => (
          <Text key={p} style={[pg.label, i <= atual && pg.labelAtivo]}>{p}</Text>
        ))}
      </View>
    </View>
  )
}

const pg = StyleSheet.create({
  wrap: { paddingHorizontal: 20, paddingBottom: 12 },
  trilho: { height: 6, borderRadius: 3, backgroundColor: C.border, overflow: "hidden" },
  barra: { height: 6, borderRadius: 3, backgroundColor: C.accent },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  label: { fontSize: 11, fontWeight: "600", color: C.subtle },
  labelAtivo: { color: C.accentDark },
})

/* ─── Linha do resumo de confirmação ── */
function LinhaResumo({ icon, label, valor }: { icon: IconName; label: string; valor: string }) {
  return (
    <View style={s.confirmRow}>
      <View style={s.confirmIcon}><Icon name={icon} size={16} color={C.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.confirmLabel}>{label}</Text>
        <Text style={s.confirmValue}>{valor}</Text>
      </View>
    </View>
  )
}

/* ─── Tela de sucesso ── */
function Sucesso({ barbeiro, data, slot, onVer, onInicio }: {
  barbeiro: string; data: Date; slot: Slot; onVer: () => void; onInicio: () => void
}) {
  return (
    <View style={s.sucesso}>
      <Animated.View entering={ZoomIn.springify().damping(12).stiffness(180)} style={s.sucessoCirculo}>
        <Animated.View entering={ZoomIn.delay(180).springify().damping(10)}>
          <Icon name="checkmark" size={56} color="#FFF" />
        </Animated.View>
      </Animated.View>

      <Animated.Text entering={FadeInUp.delay(250).duration(350)} style={s.sucessoTitulo}>
        Horário reservado!
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(320).duration(350)} style={s.sucessoTexto}>
        {barbeiro} te espera {formatarDataLonga(data)}, às {slot.horaInicio}.
      </Animated.Text>

      <Animated.View entering={FadeInUp.delay(420).duration(350)} style={s.sucessoBotoes}>
        <Button label="Ver meus agendamentos" icon="calendar-outline" onPress={onVer} />
        <Button label="Voltar ao início" variant="ghost" onPress={onInicio} />
      </Animated.View>
    </View>
  )
}

/* ─── Tela principal ── */
export default function Agendar() {
  const insets = useSafeAreaInsets()
  const { barbeariaId, nomeBarbearia } = useLocalSearchParams<{
    barbeariaId: string
    nomeBarbearia: string
  }>()

  const [step, setStep] = useState(0)
  // Direção da última navegação: decide se o passo entra pela direita ou pela esquerda
  const direcao = useRef<1 | -1>(1)
  const [sucesso, setSucesso] = useState(false)

  // Dados
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([])
  const [servicos, setServicos] = useState<Servico[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const dias = useMemo(() => proximosDias(DIAS_VISIVEIS), [])

  // Seleções
  const [barbeiroSel, setBarbeiroSel] = useState<Barbeiro | null>(null)
  const [servicosSel, setServicosSel] = useState<Servico[]>([])
  const [dataSel, setDataSel] = useState<Date>(dias[0])
  const [slotSel, setSlotSel] = useState<Slot | null>(null)

  // Loading / erro
  const [loadingBarbeiros, setLoadingBarbeiros] = useState(true)
  const [loadingServicos, setLoadingServicos] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { carregarBarbeiros() }, [])

  // Botão "voltar" do Android volta um passo, em vez de sair do agendamento
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (sucesso || step === 0) return false
        voltar()
        return true
      })
      return () => sub.remove()
    }, [step, sucesso])
  )

  async function carregarBarbeiros() {
    setLoadingBarbeiros(true)
    try {
      const data = await getBarbeirosByBarbearia(Number(barbeariaId))
      if (data.status === "success") setBarbeiros(data.barbeiros)
    } catch {
      setErro("Sem conexão com o servidor.")
    } finally {
      setLoadingBarbeiros(false)
    }
  }

  async function carregarServicos(barbeiroId: number) {
    setLoadingServicos(true)
    try {
      const data = await getServicos(barbeiroId)
      if (data.status === "success") setServicos(data.servicos)
    } catch {
      setServicos([])
    } finally {
      setLoadingServicos(false)
    }
  }

  async function carregarSlots(barbeiroId: number, data: Date, duracao: number) {
    setLoadingSlots(true)
    setSlots([])
    setSlotSel(null)
    try {
      const json = await getSlotsDisponiveis(barbeiroId, toISODate(data), duracao)
      if (json.status === "success") setSlots(json.slots)
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  function irPara(novo: number) {
    direcao.current = novo > step ? 1 : -1
    setErro(null)
    setStep(novo)
  }

  function voltar() {
    if (step === 0) { router.back(); return }
    irPara(step - 1)
  }

  /* ── Passo 1: Barbeiro ── */
  function selecionarBarbeiro(b: Barbeiro) {
    haptic.leve()
    if (b.barbeiroId !== barbeiroSel?.barbeiroId) {
      setBarbeiroSel(b)
      setServicosSel([])
      setSlotSel(null)
      carregarServicos(b.barbeiroId)
    }
    irPara(1)
  }

  /* ── Passo 2: Serviços ── */
  function toggleServico(sv: Servico) {
    haptic.leve()
    setServicosSel((sel) =>
      sel.find((x) => x.servicoId === sv.servicoId)
        ? sel.filter((x) => x.servicoId !== sv.servicoId)
        : [...sel, sv]
    )
  }

  const duracaoTotal = servicosSel.reduce((acc, sv) => acc + sv.duracaoMin, 0)
  const valorTotal = servicosSel.reduce((acc, sv) => acc + Number(sv.preco), 0)

  function confirmarServicos() {
    carregarSlots(barbeiroSel!.barbeiroId, dataSel, duracaoTotal)
    irPara(2)
  }

  /* ── Passo 3: Data e horário ── */
  function escolherDia(d: Date) {
    if (mesmoDia(d, dataSel)) return
    haptic.leve()
    setDataSel(d)
    if (barbeiroSel) carregarSlots(barbeiroSel.barbeiroId, d, duracaoTotal)
  }

  /* ── Passo 4: Confirmação ── */
  async function confirmarAgendamento() {
    if (!barbeiroSel || !slotSel) return
    setConfirmando(true)
    setErro(null)
    try {
      const user = await getUser()
      const data = await createAgendamento({
        clienteId: user?.id,
        barbeiroId: barbeiroSel.barbeiroId,
        data: toISODate(dataSel),
        horaInicio: slotSel.horaInicio,
        servicoIds: servicosSel.map((sv) => sv.servicoId),
      })
      if (data.status === "success") {
        haptic.sucesso()
        setSucesso(true)
      } else {
        haptic.erro()
        setErro(data.message ?? "Não foi possível agendar. Tente novamente.")
      }
    } catch {
      haptic.erro()
      setErro("Sem conexão com o servidor.")
    } finally {
      setConfirmando(false)
    }
  }

  if (sucesso && barbeiroSel && slotSel) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Sucesso
          barbeiro={barbeiroSel.nome}
          data={dataSel}
          slot={slotSel}
          onVer={() => router.replace("/cliente/meus-agendamentos")}
          onInicio={() => router.dismissTo("/cliente/home")}
        />
      </View>
    )
  }

  const entrada = (direcao.current === 1 ? FadeInRight : FadeInLeft).duration(260)

  /* ── Rodapé fixo (passos 2–4) ── */
  const rodape =
    step === 0 ? null : (
      <View style={[s.footer, { paddingBottom: 12 + insets.bottom }]}>
        {servicosSel.length > 0 && (
          <View style={s.footerResumo}>
            <View>
              <Text style={s.footerLabel}>Total</Text>
              <Text style={s.footerValor}>{formatarMoeda(valorTotal)}</Text>
            </View>
            <Text style={s.footerDuracao}>
              {servicosSel.length} serviço{servicosSel.length > 1 ? "s" : ""} · {duracaoTotal} min
            </Text>
          </View>
        )}
        {step === 1 && (
          <Button label="Escolher horário" icon="arrow-forward" onPress={confirmarServicos} disabled={servicosSel.length === 0} />
        )}
        {step === 2 && (
          <Button label="Revisar agendamento" icon="arrow-forward" onPress={() => irPara(3)} disabled={!slotSel} />
        )}
        {step === 3 && (
          <Button label="Confirmar agendamento" icon="checkmark-circle" onPress={confirmarAgendamento} loading={confirmando} haptic />
        )}
      </View>
    )

  /* ── Render ── */
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title={nomeBarbearia ?? "Agendar"} subtitle={`Passo ${step + 1} de ${PASSOS.length}`} onBack={voltar} />
      <Progresso atual={step} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: step === 0 ? insets.bottom + 32 : 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={step} entering={entrada}>

          {/* ════ PASSO 1: Barbeiro ════ */}
          {step === 0 && (
            <View>
              <Text style={s.stepTitle}>Com quem você quer cortar?</Text>
              <Text style={s.stepSub}>Escolha o profissional</Text>

              {loadingBarbeiros ? (
                [0, 1, 2].map((i) => <SkeletonCard key={i} />)
              ) : erro ? (
                <EmptyState icon="cloud-offline-outline" title="Sem conexão" text={erro} action={<Button label="Tentar de novo" variant="soft" onPress={() => { setErro(null); carregarBarbeiros() }} />} />
              ) : barbeiros.length === 0 ? (
                <EmptyState icon="people-outline" title="Nenhum profissional disponível" text="Esta barbearia ainda não tem barbeiros cadastrados." />
              ) : (
                barbeiros.map((b, i) => {
                  const sel = barbeiroSel?.barbeiroId === b.barbeiroId
                  return (
                    <Animated.View key={b.barbeiroId} entering={entradaLista(i)}>
                      <PressableScale style={[s.itemCard, sel && s.itemCardSel]} onPress={() => selecionarBarbeiro(b)}>
                        <Avatar nome={b.nome} size={48} />
                        <View style={s.itemInfo}>
                          <Text style={s.itemNome}>{b.nome}</Text>
                          {b.especialidade ? <Text style={s.itemSub}>{b.especialidade}</Text> : null}
                          {b.souDono ? <Badge label="Proprietário" icon="ribbon-outline" /> : null}
                        </View>
                        <Icon name="chevron-forward" size={20} color={sel ? C.accent : C.subtle} />
                      </PressableScale>
                    </Animated.View>
                  )
                })
              )}
            </View>
          )}

          {/* ════ PASSO 2: Serviços ════ */}
          {step === 1 && (
            <View>
              <Text style={s.stepTitle}>O que vamos fazer?</Text>
              <Text style={s.stepSub}>Você pode escolher mais de um serviço</Text>

              {loadingServicos ? (
                [0, 1, 2].map((i) => <SkeletonCard key={i} />)
              ) : servicos.length === 0 ? (
                <EmptyState icon="cut-outline" title="Nenhum serviço cadastrado" text="Este profissional ainda não cadastrou serviços." />
              ) : (
                servicos.map((sv, i) => {
                  const sel = !!servicosSel.find((x) => x.servicoId === sv.servicoId)
                  return (
                    <Animated.View key={sv.servicoId} entering={entradaLista(i)}>
                      <PressableScale
                        style={[s.itemCard, sel && s.itemCardSel]}
                        onPress={() => toggleServico(sv)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: sel }}
                      >
                        <View style={[s.checkbox, sel && s.checkboxSel]}>
                          {sel && (
                            <Animated.View entering={ZoomIn.springify().damping(12)}>
                              <Icon name="checkmark" size={16} color="#FFF" />
                            </Animated.View>
                          )}
                        </View>
                        <View style={s.itemInfo}>
                          <Text style={s.itemNome}>{sv.nome}</Text>
                          <View style={s.duracaoRow}>
                            <Icon name="time-outline" size={13} color={C.muted} />
                            <Text style={s.itemSub}>{sv.duracaoMin} min</Text>
                          </View>
                        </View>
                        <Text style={s.itemPreco}>{formatarMoeda(sv.preco)}</Text>
                      </PressableScale>
                    </Animated.View>
                  )
                })
              )}
            </View>
          )}

          {/* ════ PASSO 3: Data e horário ════ */}
          {step === 2 && (
            <View>
              <Text style={s.stepTitle}>Quando fica bom?</Text>
              <Text style={s.stepSub}>Horários livres para {duracaoTotal} min de atendimento</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.diasRow}
                style={s.diasScroll}
              >
                {dias.map((d, i) => {
                  const sel = mesmoDia(d, dataSel)
                  return (
                    <PressableScale
                      key={i}
                      style={[s.diaChip, sel && s.diaChipSel]}
                      onPress={() => escolherDia(d)}
                      scaleTo={0.92}
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
                      accessibilityLabel={formatarDataLonga(d)}
                    >
                      <Text style={[s.diaSemana, sel && s.diaTextSel]}>
                        {i === 0 ? "Hoje" : d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                      </Text>
                      <Text style={[s.diaNum, sel && s.diaTextSel]}>{d.getDate()}</Text>
                      <Text style={[s.diaMes, sel && s.diaTextSel]}>
                        {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                      </Text>
                    </PressableScale>
                  )
                })}
              </ScrollView>

              <Text style={s.diaExtenso}>{formatarDataLonga(dataSel)}</Text>

              {loadingSlots ? (
                <ActivityIndicator color={C.accent} style={{ marginTop: 32 }} />
              ) : slots.length === 0 ? (
                <EmptyState icon="calendar-clear-outline" title="Sem horários neste dia" text="Escolha outro dia na faixa acima." />
              ) : (
                <Animated.View key={toISODate(dataSel)} entering={FadeIn.duration(220)} style={s.slotsGrid}>
                  {slots.map((sl) => {
                    const sel = slotSel?.horaInicio === sl.horaInicio
                    return (
                      <PressableScale
                        key={sl.horaInicio}
                        style={[s.slotBtn, sel && s.slotBtnSel]}
                        onPress={() => { haptic.leve(); setSlotSel(sl) }}
                        scaleTo={0.92}
                        accessibilityRole="button"
                        accessibilityState={{ selected: sel }}
                      >
                        <Text style={[s.slotHora, sel && { color: "#FFF" }]}>{sl.horaInicio}</Text>
                        <Text style={[s.slotFim, sel && { color: "rgba(255,255,255,0.75)" }]}>até {sl.horaFim}</Text>
                      </PressableScale>
                    )
                  })}
                </Animated.View>
              )}
            </View>
          )}

          {/* ════ PASSO 4: Confirmação ════ */}
          {step === 3 && (
            <View>
              <Text style={s.stepTitle}>Tudo certo?</Text>
              <Text style={s.stepSub}>Revise antes de confirmar</Text>

              <View style={s.confirmCard}>
                <LinhaResumo icon="person-outline" label="Profissional" valor={barbeiroSel?.nome ?? ""} />
                <LinhaResumo icon="calendar-outline" label="Data" valor={formatarDataLonga(dataSel)} />
                <LinhaResumo icon="time-outline" label="Horário" valor={`${slotSel?.horaInicio} até ${slotSel?.horaFim}`} />

                <View style={s.separator} />
                <Text style={s.servicosTitulo}>Serviços</Text>
                {servicosSel.map((sv) => (
                  <View key={sv.servicoId} style={s.servicoRow}>
                    <Text style={s.servicoNome}>{sv.nome}</Text>
                    <Text style={s.servicoPreco}>{formatarMoeda(sv.preco)}</Text>
                  </View>
                ))}
              </View>

              <PressableScale style={s.recomecar} onPress={() => irPara(0)} scaleTo={0.95}>
                <Icon name="refresh" size={14} color={C.muted} />
                <Text style={s.recomecarText}>Recomeçar</Text>
              </PressableScale>

              {erro && (
                <Animated.View entering={FadeInDown.duration(220)} style={{ marginTop: 12 }}>
                  <Aviso tipo="erro" icon="alert-circle" texto={erro} />
                </Animated.View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {rodape}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  stepTitle: { fontSize: 24, fontWeight: "800", color: C.text, marginBottom: 4, letterSpacing: -0.5 },
  stepSub: { fontSize: 14, color: C.muted, marginBottom: 18 },

  // Cards de item (barbeiro / serviço)
  itemCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: C.border, ...sombra(1),
  },
  itemCardSel: { borderColor: C.accent, backgroundColor: C.accentSoft },
  itemInfo: { flex: 1, gap: 4 },
  itemNome: { fontSize: 15, fontWeight: "700", color: C.text },
  itemSub: { fontSize: 12, color: C.muted },
  itemPreco: { fontSize: 15, fontWeight: "800", color: C.text },
  duracaoRow: { flexDirection: "row", alignItems: "center", gap: 4 },

  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: C.border,
    alignItems: "center", justifyContent: "center", backgroundColor: C.card,
  },
  checkboxSel: { borderColor: C.accent, backgroundColor: C.accent },

  // Faixa de dias
  diasScroll: { marginHorizontal: -20, marginBottom: 12 },
  diasRow: { paddingHorizontal: 20, gap: 8 },
  diaChip: {
    width: 62, paddingVertical: 10, borderRadius: R.md, alignItems: "center",
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, gap: 2,
  },
  diaChipSel: { backgroundColor: C.accent, borderColor: C.accent, ...sombra(2) },
  diaSemana: { fontSize: 11, fontWeight: "600", color: C.muted, textTransform: "capitalize" },
  diaNum: { fontSize: 20, fontWeight: "800", color: C.text },
  diaMes: { fontSize: 11, color: C.muted, textTransform: "capitalize" },
  diaTextSel: { color: "#FFF" },
  diaExtenso: { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 12, textTransform: "capitalize" },

  // Horários
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slotBtn: {
    width: "31%", paddingVertical: 12, borderRadius: R.md, alignItems: "center",
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  slotBtnSel: { backgroundColor: C.accent, borderColor: C.accent },
  slotHora: { fontSize: 16, fontWeight: "800", color: C.text },
  slotFim: { fontSize: 11, color: C.muted, marginTop: 2 },

  // Confirmação
  confirmCard: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 16, gap: 14,
    borderWidth: 1, borderColor: C.border, ...sombra(2),
  },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  confirmIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center" },
  confirmLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  confirmValue: { fontSize: 15, color: C.text, fontWeight: "700", marginTop: 1, textTransform: "capitalize" },
  separator: { height: 1, backgroundColor: C.border },
  servicosTitulo: { fontSize: 12, color: C.muted, fontWeight: "600", marginBottom: -6 },
  servicoRow: { flexDirection: "row", justifyContent: "space-between" },
  servicoNome: { fontSize: 14, color: C.text },
  servicoPreco: { fontSize: 14, color: C.text, fontWeight: "700" },
  recomecar: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 6, marginTop: 16, padding: 8 },
  recomecarText: { fontSize: 13, color: C.muted, fontWeight: "600" },

  // Rodapé
  footer: {
    paddingHorizontal: 20, paddingTop: 12, gap: 10,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
  footerResumo: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  footerLabel: { fontSize: 11, color: C.muted, fontWeight: "600" },
  footerValor: { fontSize: 20, fontWeight: "800", color: C.text, letterSpacing: -0.4 },
  footerDuracao: { fontSize: 13, color: C.muted, fontWeight: "600" },

  // Sucesso
  sucesso: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  sucessoCirculo: {
    width: 112, height: 112, borderRadius: 56, backgroundColor: C.success,
    alignItems: "center", justifyContent: "center", marginBottom: 24, ...sombra(3),
  },
  sucessoTitulo: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5, textAlign: "center" },
  sucessoTexto: { fontSize: 15, color: C.muted, textAlign: "center", lineHeight: 22, marginTop: 8 },
  sucessoBotoes: { alignSelf: "stretch", gap: 4, marginTop: 32 },
})
