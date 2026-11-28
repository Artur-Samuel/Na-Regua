import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, StyleSheet, Text, View } from "react-native"
import Animated, { FadeOutLeft, FadeOutRight, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon, IconName } from "../../components/Icon"
import { Tabs } from "../../components/Tabs"
import { Avatar, Badge, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import {
  cancelarAgendamentoBarbeiro,
  concluirAgendamento,
  getAgendamentosBarbeiro,
  getBarbeiroByUserId,
  getUser,
} from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarMoeda } from "../../utils/format"
import { haptic } from "../../utils/haptics"

type Agendamento = {
  agendamentoId: number
  data: string
  horaInicio: string
  horaFim: string
  valorTotal: string
  status: "confirmado" | "concluido" | "cancelado"
  nomeCliente: string
  emailCliente: string
  telefoneCliente: string
  servicos: string
}

type Aba = "confirmado" | "concluido" | "cancelado"

const ABAS: { key: Aba; label: string }[] = [
  { key: "confirmado", label: "Pendentes" },
  { key: "concluido",  label: "Concluídos" },
  { key: "cancelado",  label: "Cancelados" },
]

const STATUS: Record<Aba, { label: string; cor: string; fundo: string; icon: IconName }> = {
  confirmado: { label: "Pendente",  cor: C.warning, fundo: C.warningLight, icon: "time" },
  concluido:  { label: "Concluído", cor: C.success, fundo: C.successLight, icon: "checkmark-circle" },
  cancelado:  { label: "Cancelado", cor: C.error,   fundo: C.errorLight,   icon: "close-circle" },
}

const VAZIO: Record<Aba, { icon: IconName; title: string; text: string }> = {
  confirmado: { icon: "calendar-outline", title: "Nenhum agendamento pendente", text: "Novos agendamentos dos clientes aparecem aqui." },
  concluido:  { icon: "checkmark-done-outline", title: "Nenhum atendimento concluído", text: "Conclua um atendimento para ele aparecer aqui." },
  cancelado:  { icon: "close-circle-outline", title: "Nenhum agendamento cancelado", text: "Ótimo sinal!" },
}

function formatarDia(mysqlDate: string) {
  const [ano, mes, dia] = mysqlDate.split("-")
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia))
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)

  if (data.getTime() === hoje.getTime()) return "Hoje"
  if (data.getTime() === amanha.getTime()) return "Amanhã"
  return data.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
}

function AgendamentoCard({ item, onConcluir, onCancelar }: {
  item: Agendamento
  onConcluir?: () => void
  onCancelar?: () => void
}) {
  const st = STATUS[item.status]
  const dia = formatarDia(item.data)
  const ehHoje = dia === "Hoje"

  return (
    <View style={[s.card, ehHoje && item.status === "confirmado" && s.cardHoje]}>
      {/* Horário em destaque */}
      <View style={s.horaRow}>
        <View style={[s.horaPill, ehHoje && { backgroundColor: C.accent }]}>
          <Text style={[s.horaDia, ehHoje && { color: "#FFF" }]}>{dia}</Text>
          <Text style={[s.horaTexto, ehHoje && { color: "#FFF" }]}>
            {item.horaInicio.slice(0, 5)} – {item.horaFim.slice(0, 5)}
          </Text>
        </View>
        <Badge label={st.label} cor={st.cor} fundo={st.fundo} icon={st.icon} />
      </View>

      <View style={s.clienteRow}>
        <Avatar nome={item.nomeCliente} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.nomeCliente}>{item.nomeCliente}</Text>
          {item.telefoneCliente ? (
            <View style={s.linha}>
              <Icon name="call-outline" size={12} color={C.muted} />
              <Text style={s.telefoneCliente}>{item.telefoneCliente}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.valor}>{formatarMoeda(item.valorTotal)}</Text>
      </View>

      <View style={s.servicosBox}>
        <Icon name="cut-outline" size={14} color={C.muted} />
        <Text style={s.servicosText} numberOfLines={2}>{item.servicos}</Text>
      </View>

      {item.status === "confirmado" && (onConcluir || onCancelar) && (
        <View style={s.botoesRow}>
          {onCancelar && (
            <Button label="Cancelar" variant="danger" onPress={onCancelar} style={s.botao} />
          )}
          {onConcluir && (
            <Button label="Concluir" icon="checkmark" onPress={onConcluir} style={[s.botao, { backgroundColor: C.success }]} />
          )}
        </View>
      )}
    </View>
  )
}

export default function AgendamentosBarbeiro() {
  const insets = useSafeAreaInsets()
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null)
  const [abaAtiva, setAbaAtiva] = useState<Aba>("confirmado")
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Saída do card: concluído desliza para a direita, cancelado para a esquerda
  const [saida, setSaida] = useState<"concluir" | "cancelar">("concluir")

  useEffect(() => { init() }, [])
  useEffect(() => { if (barbeiroId) carregar(barbeiroId, abaAtiva) }, [abaAtiva])

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }

    try {
      // Funciona para dono e funcionário: busca o barbeiroId do próprio usuário
      const data = await getBarbeiroByUserId(user.id)
      if (data.status !== "success") { setLoading(false); return }
      setBarbeiroId(data.barbeiro.barbeiroId)
      await carregar(data.barbeiro.barbeiroId, abaAtiva)
    } catch {
      setLoading(false)
    }
  }

  async function carregar(id: number, status: Aba, mostrarLoading = true) {
    if (mostrarLoading) setLoading(true)
    try {
      const data = await getAgendamentosBarbeiro(id, status)
      if (data.status === "success") setAgendamentos(data.agendamentos)
    } catch {
      // mantém a lista anterior
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    if (!barbeiroId) return
    setRefreshing(true)
    await carregar(barbeiroId, abaAtiva, false)
    setRefreshing(false)
  }

  function removerLocal(id: number) {
    setAgendamentos((lista) => lista.filter((x) => x.agendamentoId !== id))
  }

  function handleCancelar(ag: Agendamento) {
    Alert.alert(
      "Cancelar agendamento",
      `Cancelar o atendimento de ${ag.nomeCliente} (${formatarDia(ag.data)} às ${ag.horaInicio.slice(0, 5)})?`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Cancelar",
          style: "destructive",
          onPress: async () => {
            if (!barbeiroId) return
            try {
              const res = await cancelarAgendamentoBarbeiro(ag.agendamentoId, barbeiroId)
              if (res.status === "success") {
                haptic.sucesso()
                setSaida("cancelar")
                removerLocal(ag.agendamentoId)
              } else {
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

  function handleConcluir(ag: Agendamento) {
    Alert.alert(
      "Concluir atendimento",
      `Marcar o atendimento de ${ag.nomeCliente} como concluído?`,
      [
        { text: "Voltar", style: "cancel" },
        {
          text: "Concluir",
          onPress: async () => {
            if (!barbeiroId) return
            try {
              const res = await concluirAgendamento(ag.agendamentoId, barbeiroId)
              if (res.status === "success") {
                haptic.sucesso()
                setSaida("concluir")
                removerLocal(ag.agendamentoId)
              } else {
                Alert.alert("Erro", res.message ?? "Não foi possível concluir.")
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
      <Header title="Agendamentos" />
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
          ListEmptyComponent={<EmptyState icon={vazio.icon} title={vazio.title} text={vazio.text} />}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={entradaLista(index)}
              exiting={(saida === "concluir" ? FadeOutRight : FadeOutLeft).duration(220)}
            >
              <AgendamentoCard
                item={item}
                onConcluir={item.status === "confirmado" ? () => handleConcluir(item) : undefined}
                onCancelar={item.status === "confirmado" ? () => handleCancelar(item) : undefined}
              />
            </Animated.View>
          )}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  list: { padding: 20, paddingTop: 12 },

  card: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 12, gap: 12,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardHoje: { borderColor: C.accent, borderWidth: 1.5 },

  horaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  horaPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.accentLight, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  horaDia: { fontSize: 12, fontWeight: "700", color: C.accentDark, textTransform: "capitalize" },
  horaTexto: { fontSize: 14, fontWeight: "800", color: C.accentDark },

  clienteRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  nomeCliente: { fontSize: 15, fontWeight: "700", color: C.text },
  linha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  telefoneCliente: { fontSize: 12, color: C.muted },
  valor: { fontSize: 16, fontWeight: "800", color: C.text },

  servicosBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: C.bg, borderRadius: R.sm, padding: 10,
  },
  servicosText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },

  botoesRow: { flexDirection: "row", gap: 10 },
  botao: { flex: 1, width: undefined, height: 44 },
})
