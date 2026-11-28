import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Alert, StyleSheet, Text, View } from "react-native"
import Animated, { FadeOutLeft, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import Estrelas from "../../components/Estrelas"
import { Header } from "../../components/Header"
import { Icon, IconName } from "../../components/Icon"
import { Tabs } from "../../components/Tabs"
import { Badge, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import { cancelarAgendamento, getAgendamentosCliente, getUser } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarData, formatarMoeda } from "../../utils/format"
import { haptic } from "../../utils/haptics"

/* ─── Tipos ── */
type Agendamento = {
  agendamentoId: number
  data: string
  horaInicio: string
  horaFim: string
  valorTotal: string
  status: "confirmado" | "concluido" | "cancelado"
  nomeBarbeiro: string
  nomeBarbearia: string
  enderecoBarbearia: string
  cidadeBarbearia: string
  servicos: string
  notaAvaliacao: number | null   // null = ainda não avaliado
}

type Aba = "confirmado" | "concluido" | "cancelado"

const ABAS: { key: Aba; label: string }[] = [
  { key: "confirmado", label: "Próximos" },
  { key: "concluido",  label: "Concluídos" },
  { key: "cancelado",  label: "Cancelados" },
]

const STATUS: Record<Aba, { label: string; cor: string; fundo: string; icon: IconName }> = {
  confirmado: { label: "Confirmado", cor: C.success, fundo: C.successLight, icon: "checkmark-circle" },
  concluido:  { label: "Concluído",  cor: C.accent,  fundo: C.accentLight,  icon: "ribbon" },
  cancelado:  { label: "Cancelado",  cor: C.error,   fundo: C.errorLight,   icon: "close-circle" },
}

const VAZIO: Record<Aba, { icon: IconName; title: string; text: string }> = {
  confirmado: { icon: "calendar-outline", title: "Nenhum agendamento próximo", text: "Que tal marcar aquele corte?" },
  concluido:  { icon: "checkmark-done-outline", title: "Nenhum atendimento concluído", text: "Seus cortes finalizados aparecem aqui." },
  cancelado:  { icon: "close-circle-outline", title: "Nenhum agendamento cancelado", text: "Ótimo sinal!" },
}

/** Dia e mês em destaque na lateral do card. */
function BlocoData({ data, cor }: { data: string; cor: string }) {
  const [ano, mes, dia] = data.split("-").map(Number)
  const d = new Date(ano, mes - 1, dia)
  return (
    <View style={[s.blocoData, { backgroundColor: cor + "14" }]}>
      <Text style={[s.blocoDia, { color: cor }]}>{String(dia).padStart(2, "0")}</Text>
      <Text style={[s.blocoMes, { color: cor }]}>
        {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
      </Text>
    </View>
  )
}

function Detalhe({ icon, texto, linhas }: { icon: IconName; texto: string; linhas?: number }) {
  return (
    <View style={s.detalheRow}>
      <Icon name={icon} size={15} color={C.muted} />
      <Text style={s.detalheText} numberOfLines={linhas}>{texto}</Text>
    </View>
  )
}

/* ─── Card de agendamento ── */
function AgendamentoCard({ item, onCancelar, onAvaliar }: {
  item: Agendamento
  onCancelar?: () => void
  onAvaliar?: () => void
}) {
  const st = STATUS[item.status]
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <BlocoData data={item.data} cor={st.cor} />
        <View style={{ flex: 1 }}>
          <Text style={s.cardBarbearia} numberOfLines={1}>{item.nomeBarbearia}</Text>
          <Text style={s.cardBarbeiro}>com {item.nomeBarbeiro}</Text>
        </View>
        <Badge label={st.label} cor={st.cor} fundo={st.fundo} icon={st.icon} />
      </View>

      <View style={s.cardBody}>
        <Detalhe icon="time-outline" texto={`${formatarData(item.data)} · ${item.horaInicio.slice(0, 5)} até ${item.horaFim.slice(0, 5)}`} />
        <Detalhe icon="cut-outline" texto={item.servicos} linhas={2} />
        <Detalhe icon="location-outline" texto={`${item.enderecoBarbearia}, ${item.cidadeBarbearia}`} />
      </View>

      <View style={s.cardFooter}>
        <Text style={s.valorLabel}>Total</Text>
        <Text style={s.valor}>{formatarMoeda(item.valorTotal)}</Text>
      </View>

      {item.status === "confirmado" && onCancelar && (
        <View style={s.acao}>
          <Button label="Cancelar agendamento" variant="danger" icon="close-outline" onPress={onCancelar} style={{ height: 44 }} />
        </View>
      )}

      {item.status === "concluido" && (
        item.notaAvaliacao != null ? (
          <View style={s.avaliadoRow}>
            <Text style={s.avaliadoLabel}>Sua avaliação</Text>
            <Estrelas nota={item.notaAvaliacao} tamanho={16} />
          </View>
        ) : onAvaliar ? (
          <View style={s.acao}>
            <Button label="Avaliar atendimento" variant="soft" icon="star" onPress={onAvaliar} style={{ height: 44, backgroundColor: C.warningLight }} />
          </View>
        ) : null
      )}
    </View>
  )
}

/* ─── Tela principal ── */
export default function MeusAgendamentos() {
  const insets = useSafeAreaInsets()
  // ?aba=concluido abre direto em Concluídos (vem do aviso da home)
  const { aba } = useLocalSearchParams<{ aba?: Aba }>()
  const [clienteId, setClienteId] = useState<number | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>(
    aba && ABAS.some((a) => a.key === aba) ? aba : "confirmado"
  )
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { init() }, [])
  useEffect(() => { if (clienteId) carregar(clienteId, abaAtiva) }, [abaAtiva])

  // Ao voltar da tela de avaliar, recarrega para o botão virar estrelas.
  // A primeira vez que a tela ganha foco é ignorada (o init já carrega).
  // Refs para o efeito não rodar de novo a cada troca de aba (isso o useEffect acima já faz).
  const primeiroFoco = useRef(true)
  const atual = useRef({ clienteId, abaAtiva })
  atual.current = { clienteId, abaAtiva }
  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) { primeiroFoco.current = false; return }
      const { clienteId: id, abaAtiva: a } = atual.current
      if (id) carregar(id, a, false)
    }, [])
  )

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }
    setClienteId(user.id)
    await carregar(user.id, abaAtiva)
  }

  async function carregar(id: number, status: Aba, mostrarLoading = true) {
    if (mostrarLoading) setLoading(true)
    try {
      const data = await getAgendamentosCliente(id, status)
      if (data.status === "success") setAgendamentos(data.agendamentos)
    } catch {
      // mantém a lista anterior
    } finally {
      setLoading(false)
    }
  }

  function avaliar(ag: Agendamento) {
    router.push({
      pathname: "/cliente/avaliar",
      params: {
        agendamentoId: String(ag.agendamentoId),
        nomeBarbearia: ag.nomeBarbearia,
        nomeBarbeiro: ag.nomeBarbeiro,
        data: ag.data,
      },
    })
  }

  async function onRefresh() {
    if (!clienteId) return
    setRefreshing(true)
    await carregar(clienteId, abaAtiva, false)
    setRefreshing(false)
  }

  function handleCancelar(ag: Agendamento) {
    Alert.alert(
      "Cancelar agendamento",
      `Deseja cancelar o agendamento em ${ag.nomeBarbearia} no dia ${formatarData(ag.data)} às ${ag.horaInicio.slice(0, 5)}?`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar agendamento",
          style: "destructive",
          onPress: async () => {
            if (!clienteId) return
            try {
              const res = await cancelarAgendamento(ag.agendamentoId, clienteId)
              if (res.status === "success") {
                haptic.sucesso()
                // Remove localmente: o card sai deslizando e os outros sobem
                setAgendamentos((lista) => lista.filter((x) => x.agendamentoId !== ag.agendamentoId))
              } else {
                haptic.erro()
                Alert.alert("Erro", res.message ?? "Não foi possível cancelar.")
              }
            } catch {
              Alert.alert("Sem conexão", "Não foi possível falar com o servidor.")
            }
          },
        },
      ]
    )
  }

  const vazio = VAZIO[abaAtiva]

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title="Meus agendamentos" />
      <Tabs abas={ABAS} ativa={abaAtiva} onChange={setAbaAtiva} />

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <Animated.FlatList
          data={agendamentos}
          keyExtractor={(item) => String(item.agendamentoId)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          itemLayoutAnimation={LinearTransition.springify().damping(18)}
          ListEmptyComponent={
            <EmptyState
              icon={vazio.icon}
              title={vazio.title}
              text={vazio.text}
              action={
                abaAtiva === "confirmado" ? (
                  <Button label="Agendar agora" icon="add" onPress={() => router.dismissTo("/cliente/home")} />
                ) : undefined
              }
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={entradaLista(index)} exiting={FadeOutLeft.duration(220)}>
              <AgendamentoCard
                item={item}
                onCancelar={item.status === "confirmado" ? () => handleCancelar(item) : undefined}
                onAvaliar={item.status === "concluido" ? () => avaliar(item) : undefined}
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  )
}

/* ─── Styles ── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  list: { padding: 20, paddingTop: 12 },

  card: {
    backgroundColor: C.card, borderRadius: R.lg, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  blocoData: { width: 50, height: 54, borderRadius: R.md, alignItems: "center", justifyContent: "center" },
  blocoDia: { fontSize: 20, fontWeight: "800", lineHeight: 22 },
  blocoMes: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  cardBarbearia: { fontSize: 15, fontWeight: "700", color: C.text },
  cardBarbeiro: { fontSize: 12, color: C.muted, marginTop: 2 },

  cardBody: { paddingHorizontal: 14, gap: 8 },
  detalheRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  detalheText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },

  cardFooter: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    margin: 14, marginBottom: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  valorLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  valor: { fontSize: 17, fontWeight: "800", color: C.text },

  acao: { paddingHorizontal: 14, paddingBottom: 14, marginTop: -4 },
  avaliadoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 14, marginBottom: 14, marginTop: -4,
  },
  avaliadoLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
})
