import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeOutLeft, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon } from "../../components/Icon"
import { Avatar, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import { getBarbeiroByUserId, getConvites, getUser, responderConvite } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarData } from "../../utils/format"
import { haptic } from "../../utils/haptics"

type Convite = {
  conviteId: number
  status: string
  criadoEm: string
  barbeariaId: number
  nomeBarbearia: string
  endereco: string
  cidade: string
  telefone: string
}

export default function ConvitesBarbeiro() {
  const insets = useSafeAreaInsets()
  const [barbeiroId, setBarbeiroId]       = useState<number | null>(null)
  const [convites, setConvites]           = useState<Convite[]>([])
  const [loading, setLoading]             = useState(true)
  const [respondendo, setRespondendo]     = useState<number | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }

    try {
      const data = await getBarbeiroByUserId(user.id)
      if (data.status !== "success") return

      // Se já tem barbearia como dono, redireciona
      if (data.barbeiro.souDono && data.barbeiro.barbeariaId) {
        router.replace("/barbeiro/dashboard")
        return
      }

      setBarbeiroId(data.barbeiro.barbeiroId)
      await carregarConvites(data.barbeiro.barbeiroId)
    } catch {
      // sem conexão: lista vazia
    } finally {
      setLoading(false)
    }
  }

  async function carregarConvites(id: number) {
    const data = await getConvites({ barbeiroId: id, tipo: "recebidos" })
    if (data.status === "success") setConvites(data.convites)
  }

  function handleResponder(convite: Convite, resposta: "aceito" | "recusado") {
    if (!barbeiroId) return

    Alert.alert(
      resposta === "aceito" ? "Aceitar convite" : "Recusar convite",
      resposta === "aceito"
        ? `Entrar para a equipe de ${convite.nomeBarbearia}?`
        : `Recusar o convite de ${convite.nomeBarbearia}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: resposta === "aceito" ? "Aceitar" : "Recusar",
          style: resposta === "recusado" ? "destructive" : "default",
          onPress: async () => {
            setRespondendo(convite.conviteId)
            try {
              const res = await responderConvite({ conviteId: convite.conviteId, barbeiroId, resposta })
              if (res.status === "success") {
                haptic.sucesso()
                if (resposta === "aceito") {
                  router.replace("/barbeiro/dashboard")
                } else {
                  setConvites((l) => l.filter((c) => c.conviteId !== convite.conviteId))
                }
              } else {
                Alert.alert("Erro", res.message ?? "Tente novamente.")
              }
            } catch {
              Alert.alert("Sem conexão", "Não foi possível falar com o servidor.")
            } finally {
              setRespondendo(null)
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title="Convites recebidos" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        {loading ? (
          [0, 1].map((i) => <SkeletonCard key={i} />)
        ) : convites.length === 0 ? (
          <EmptyState
            icon="mail-open-outline"
            title="Nenhum convite pendente"
            text="Quando uma barbearia te convidar para a equipe, o convite aparece aqui."
          />
        ) : (
          convites.map((c, i) => (
            <Animated.View
              key={c.conviteId}
              entering={entradaLista(i)}
              exiting={FadeOutLeft.duration(220)}
              layout={LinearTransition.springify().damping(18)}
              style={s.card}
            >
              <View style={s.cardHeader}>
                <Avatar nome={c.nomeBarbearia} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNome}>{c.nomeBarbearia}</Text>
                  <Text style={s.cardSub}>Convite recebido em {formatarData(c.criadoEm)}</Text>
                </View>
              </View>

              <View style={s.detalhes}>
                <View style={s.linha}>
                  <Icon name="location-outline" size={14} color={C.muted} />
                  <Text style={s.detalhe}>{c.endereco}, {c.cidade}</Text>
                </View>
                {c.telefone ? (
                  <View style={s.linha}>
                    <Icon name="call-outline" size={14} color={C.muted} />
                    <Text style={s.detalhe}>{c.telefone}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.botoesRow}>
                <Button
                  label="Recusar" variant="outline" style={s.botao}
                  onPress={() => handleResponder(c, "recusado")}
                  disabled={respondendo === c.conviteId}
                />
                <Button
                  label="Aceitar" icon="checkmark" style={[s.botao, { backgroundColor: C.success }]}
                  onPress={() => handleResponder(c, "aceito")}
                  loading={respondendo === c.conviteId}
                />
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 8 },
  card: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 12, gap: 12,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardNome: { fontSize: 16, fontWeight: "700", color: C.text },
  cardSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  detalhes: { gap: 6, backgroundColor: C.bg, borderRadius: R.sm, padding: 10 },
  linha: { flexDirection: "row", alignItems: "center", gap: 6 },
  detalhe: { flex: 1, fontSize: 13, color: C.text },
  botoesRow: { flexDirection: "row", gap: 10 },
  botao: { flex: 1, width: undefined, height: 44 },
})
