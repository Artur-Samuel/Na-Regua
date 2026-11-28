import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import Animated, { FadeIn, FadeOut, FadeOutLeft, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon } from "../../components/Icon"
import { PressableScale } from "../../components/PressableScale"
import { Tabs } from "../../components/Tabs"
import { Avatar, Badge, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import {
  criarConvite,
  getBarbeirosByBarbearia,
  getBarbeirosDisponiveis,
  getBarbershopByUser,
  getConvites,
  getUser,
  removerBarbeiro,
} from "../../services/api"
import { C, R, sombra } from "../../theme"
import { haptic } from "../../utils/haptics"

type BarbeiroDisponivel = {
  barbeiroId: number
  nome: string
  email: string
  telefone: string
  especialidade: string | null
}

type Convite = {
  conviteId: number
  status: "pendente" | "aceito" | "recusado"
  criadoEm: string
  respondidoEm: string | null
  nomeBarbeiro: string
  emailBarbeiro: string
}

type MembroEquipe = {
  barbeiroId: number
  nome: string
  souDono: boolean
  especialidade: string | null
}

type Aba = "equipe" | "disponiveis" | "convites"

const ABAS: { key: Aba; label: string }[] = [
  { key: "equipe",      label: "Equipe" },
  { key: "disponiveis", label: "Convidar" },
  { key: "convites",    label: "Enviados" },
]

const STATUS_CONVITE: Record<string, { label: string; cor: string; fundo: string }> = {
  pendente: { label: "Pendente", cor: C.warning, fundo: C.warningLight },
  aceito:   { label: "Aceito",   cor: C.success, fundo: C.successLight },
  recusado: { label: "Recusado", cor: C.error,   fundo: C.errorLight   },
}

export default function ConvitesDono() {
  const insets = useSafeAreaInsets()
  const [abaAtiva, setAbaAtiva] = useState<Aba>("equipe")
  const [loading, setLoading] = useState(true)

  const [userId, setUserId]             = useState<number | null>(null)
  const [barbeariaId, setBarbeariaId]   = useState<number | null>(null)
  const [equipe, setEquipe]             = useState<MembroEquipe[]>([])
  const [disponiveis, setDisponiveis]   = useState<BarbeiroDisponivel[]>([])
  const [convites, setConvites]         = useState<Convite[]>([])
  const [convidando, setConvidando]     = useState<number | null>(null)
  const [busca, setBusca]               = useState("")

  useEffect(() => { init() }, [])
  useEffect(() => { if (barbeariaId) carregarAba(abaAtiva) }, [abaAtiva])

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }
    setUserId(user.id)

    try {
      const data = await getBarbershopByUser(user.id)
      if (data.status !== "success") { setLoading(false); return }

      const id = data.barbearia.barbeariaId
      setBarbeariaId(id)
      await carregarAba("equipe", id)
    } catch {
      setLoading(false)
    }
  }

  async function carregarAba(aba: Aba, id?: number) {
    const bId = id ?? barbeariaId
    if (!bId) return
    setLoading(true)
    if (aba !== "disponiveis") setBusca("")

    try {
      if (aba === "equipe") {
        const data = await getBarbeirosByBarbearia(bId)
        if (data.status === "success") setEquipe(data.barbeiros)
      } else if (aba === "disponiveis") {
        const data = await getBarbeirosDisponiveis(bId)
        if (data.status === "success") setDisponiveis(data.barbeiros)
      } else {
        const data = await getConvites({ barbeariaId: bId, tipo: "enviados" })
        if (data.status === "success") setConvites(data.convites)
      }
    } catch {
      // mantém o que já estava
    } finally {
      setLoading(false)
    }
  }

  const termo = busca.trim().toLowerCase()
  const disponiveisFiltrados = termo
    ? disponiveis.filter((b) => b.nome.toLowerCase().includes(termo) || b.email.toLowerCase().includes(termo))
    : disponiveis

  function handleConvidar(b: BarbeiroDisponivel) {
    if (!barbeariaId || !userId) return
    Alert.alert("Enviar convite", `Convidar ${b.nome} para sua equipe?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Convidar",
        onPress: async () => {
          setConvidando(b.barbeiroId)
          try {
            const res = await criarConvite({ barbeariaId, barbeiroId: b.barbeiroId, userId })
            if (res.status === "success") {
              haptic.sucesso()
              // Sai da lista de disponíveis (agora tem convite pendente)
              setDisponiveis((l) => l.filter((x) => x.barbeiroId !== b.barbeiroId))
            } else {
              Alert.alert("Erro", res.message ?? "Não foi possível enviar o convite.")
            }
          } catch {
            Alert.alert("Sem conexão", "Não foi possível falar com o servidor.")
          } finally {
            setConvidando(null)
          }
        },
      },
    ])
  }

  function handleRemover(membro: MembroEquipe) {
    if (!barbeariaId || !userId) return
    Alert.alert(
      "Remover da equipe",
      `Deseja remover ${membro.nome} da sua barbearia? O barbeiro ficará sem vínculo.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await removerBarbeiro({ barbeiroId: membro.barbeiroId, barbeariaId, userId })
              if (res.status === "success") {
                haptic.sucesso()
                setEquipe((l) => l.filter((x) => x.barbeiroId !== membro.barbeiroId))
              } else {
                Alert.alert("Erro", res.message ?? "Não foi possível remover.")
              }
            } catch {
              Alert.alert("Sem conexão", "Não foi possível falar com o servidor.")
            }
          },
        },
      ]
    )
  }

  const itemAnim = (i: number) => ({
    entering: entradaLista(i),
    exiting: FadeOutLeft.duration(220),
    layout: LinearTransition.springify().damping(18),
  })

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title="Equipe" />
      <Tabs abas={ABAS} ativa={abaAtiva} onChange={setAbaAtiva} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Busca fica fora do loading para o teclado não fechar */}
        {abaAtiva === "disponiveis" && (
          <View style={s.searchBar}>
            <Icon name="search" size={18} color={C.subtle} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar por nome ou e-mail"
              placeholderTextColor={C.subtle}
              value={busca}
              onChangeText={setBusca}
              autoCapitalize="none"
            />
            {busca.length > 0 && (
              <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)}>
                <PressableScale onPress={() => setBusca("")} hitSlop={10} scaleTo={0.85} accessibilityLabel="Limpar busca">
                  <Icon name="close-circle" size={18} color={C.subtle} />
                </PressableScale>
              </Animated.View>
            )}
          </View>
        )}

        {loading ? (
          [0, 1, 2].map((i) => <SkeletonCard key={i} />)
        ) : abaAtiva === "equipe" ? (
          equipe.length === 0 ? (
            <EmptyState icon="people-outline" title="Nenhum membro na equipe ainda" text="Use a aba “Convidar” para adicionar barbeiros." />
          ) : (
            equipe.map((m, i) => {
              const dono = Number(m.souDono) === 1
              return (
                <Animated.View key={m.barbeiroId} {...itemAnim(i)} style={s.card}>
                  <Avatar nome={m.nome} />
                  <View style={s.cardInfo}>
                    <Text style={s.cardNome}>{m.nome}</Text>
                    {m.especialidade ? <Text style={s.cardSub}>{m.especialidade}</Text> : null}
                    {dono && <Badge label="Proprietário" icon="ribbon-outline" />}
                  </View>
                  {!dono && (
                    <Button label="Remover" variant="danger" onPress={() => handleRemover(m)} style={s.btnPequeno} />
                  )}
                </Animated.View>
              )
            })
          )
        ) : abaAtiva === "disponiveis" ? (
          disponiveis.length === 0 ? (
            <EmptyState
              icon="person-add-outline"
              title="Nenhum barbeiro disponível"
              text="Todos os barbeiros cadastrados já estão em uma barbearia ou com convite pendente."
            />
          ) : disponiveisFiltrados.length === 0 ? (
            <EmptyState icon="search-outline" title="Nenhum resultado" text={`Nenhum barbeiro encontrado para "${busca}".`} />
          ) : (
            disponiveisFiltrados.map((b, i) => (
              <Animated.View key={b.barbeiroId} {...itemAnim(i)} style={s.card}>
                <Avatar nome={b.nome} />
                <View style={s.cardInfo}>
                  <Text style={s.cardNome}>{b.nome}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>{b.email}</Text>
                  {b.especialidade ? <Text style={s.cardSub}>{b.especialidade}</Text> : null}
                </View>
                <Button
                  label="Convidar"
                  onPress={() => handleConvidar(b)}
                  loading={convidando === b.barbeiroId}
                  style={s.btnPequeno}
                />
              </Animated.View>
            ))
          )
        ) : convites.length === 0 ? (
          <EmptyState icon="paper-plane-outline" title="Nenhum convite enviado" text="Os convites que você enviar aparecem aqui com o status." />
        ) : (
          convites.map((c, i) => {
            const st = STATUS_CONVITE[c.status] ?? STATUS_CONVITE.pendente
            return (
              <Animated.View key={c.conviteId} {...itemAnim(i)} style={s.card}>
                <Avatar nome={c.nomeBarbeiro} />
                <View style={s.cardInfo}>
                  <Text style={s.cardNome}>{c.nomeBarbeiro}</Text>
                  <Text style={s.cardSub} numberOfLines={1}>{c.emailBarbeiro}</Text>
                </View>
                <Badge label={st.label} cor={st.cor} fundo={st.fundo} />
              </Animated.View>
            )
          })
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 12 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardInfo: { flex: 1, gap: 3 },
  cardNome: { fontSize: 15, fontWeight: "700", color: C.text },
  cardSub: { fontSize: 12, color: C.muted },
  btnPequeno: { width: undefined, height: 38, paddingHorizontal: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12,
    backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 12,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, height: 46 },
})
