// src/app/barbeiro/avaliacoes.tsx
// Todas as avaliações da barbearia (dono e funcionários veem). Só leitura: ninguém apaga.
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { FlatList, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import Estrelas, { formatarMedia } from "../../components/Estrelas"
import { Header } from "../../components/Header"
import { Avatar, EmptyState, entradaLista, Skeleton, SkeletonCard } from "../../components/ui"
import { chaveAvaliacaoVista, getAvaliacoesBarbearia } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarData } from "../../utils/format"

type Avaliacao = {
  avaliacaoId: number
  nota: number
  comentario: string | null
  criadoEm: string
  nomeCliente: string
  nomeBarbeiro: string
  dataAtendimento: string
}

type Resumo = {
  total: number
  media: number | null
  distribuicao: Record<"1" | "2" | "3" | "4" | "5", number>
}

/** Barra da distribuição: cresce da esquerda ao aparecer. */
function Barra({ pct, ordem }: { pct: number; ordem: number }) {
  const w = useSharedValue(0)
  useEffect(() => {
    w.value = withDelay(150 + ordem * 60, withTiming(pct, { duration: 500 }))
  }, [pct])
  const anim = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }))
  return (
    <View style={s.barraFundo}>
      <Animated.View style={[s.barraCheia, anim]} />
    </View>
  )
}

function Cabecalho({ resumo }: { resumo: Resumo }) {
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={s.resumo}>
      <View style={s.resumoEsq}>
        <Text style={s.media}>{resumo.media != null ? formatarMedia(resumo.media) : "–"}</Text>
        <Estrelas nota={resumo.media ?? 0} tamanho={15} />
        <Text style={s.total}>{resumo.total} avaliaç{resumo.total === 1 ? "ão" : "ões"}</Text>
      </View>
      <View style={s.resumoDir}>
        {(["5", "4", "3", "2", "1"] as const).map((n, i) => {
          const qtd = resumo.distribuicao[n]
          const pct = resumo.total ? qtd / resumo.total : 0
          return (
            <View key={n} style={s.barraLinha}>
              <Text style={s.barraNum}>{n}</Text>
              <Barra pct={pct} ordem={i} />
              <Text style={s.barraQtd}>{qtd}</Text>
            </View>
          )
        })}
      </View>
    </Animated.View>
  )
}

export default function AvaliacoesBarbearia() {
  const insets = useSafeAreaInsets()
  const { barbeariaId } = useLocalSearchParams<{ barbeariaId?: string }>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [lista, setLista] = useState<Avaliacao[]>([])
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    try {
      const d = await getAvaliacoesBarbearia()
      if (d.status !== "success") { setErro(d.message ?? "Erro ao carregar"); return }
      setResumo(d.resumo)
      setLista(d.avaliacoes)
      setErro(null)
      // Marca tudo como visto: o selo "novas" do dashboard zera
      if (barbeariaId && d.avaliacoes.length > 0) {
        const maior = Math.max(...d.avaliacoes.map((a: Avaliacao) => a.avaliacaoId))
        AsyncStorage.setItem(chaveAvaliacaoVista(Number(barbeariaId)), String(maior)).catch(() => {})
      }
    } catch {
      setErro("Sem conexão com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header title="Avaliações" />

      {loading ? (
        <View style={s.list}>
          <Skeleton height={130} radius={R.lg} style={{ marginBottom: 14 }} />
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(a) => String(a.avaliacaoId)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListHeaderComponent={resumo && resumo.total > 0 ? <Cabecalho resumo={resumo} /> : null}
          ListEmptyComponent={
            erro
              ? <EmptyState icon="cloud-offline-outline" title="Algo deu errado" text={erro} />
              : <EmptyState icon="star-outline" title="Nenhuma avaliação ainda" text="Elas aparecem aqui quando os clientes avaliarem atendimentos concluídos." />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={entradaLista(index)} style={s.card}>
              <View style={s.cardTopo}>
                <Avatar nome={item.nomeCliente} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cliente}>{item.nomeCliente}</Text>
                  <Text style={s.meta}>atendido por {item.nomeBarbeiro} em {formatarData(item.dataAtendimento)}</Text>
                </View>
                <Text style={s.cardData}>{formatarData(item.criadoEm)}</Text>
              </View>
              <Estrelas nota={item.nota} tamanho={15} />
              {item.comentario ? (
                <Text style={s.comentario}>{item.comentario}</Text>
              ) : (
                <Text style={s.semComentario}>Sem comentário</Text>
              )}
            </Animated.View>
          )}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  list: { padding: 20, paddingTop: 8 },

  resumo: {
    flexDirection: "row", gap: 18, backgroundColor: C.card, borderRadius: R.lg,
    padding: 18, borderWidth: 1, borderColor: C.border, marginBottom: 14, ...sombra(2),
  },
  resumoEsq: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 90 },
  media: { fontSize: 40, fontWeight: "800", color: C.text, letterSpacing: -1 },
  total: { fontSize: 11, color: C.muted, marginTop: 2 },
  resumoDir: { flex: 1, justifyContent: "center", gap: 6 },
  barraLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  barraNum: { width: 10, fontSize: 11, fontWeight: "700", color: C.muted, textAlign: "right" },
  barraFundo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.border, overflow: "hidden" },
  barraCheia: { height: 8, borderRadius: 4, backgroundColor: C.star },
  barraQtd: { width: 24, fontSize: 11, color: C.muted },

  card: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 10, gap: 10,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardTopo: { flexDirection: "row", alignItems: "center", gap: 10 },
  cliente: { fontSize: 14, fontWeight: "700", color: C.text },
  meta: { fontSize: 11, color: C.muted, marginTop: 1 },
  cardData: { fontSize: 11, color: C.subtle },
  comentario: { fontSize: 14, color: C.text, lineHeight: 20 },
  semComentario: { fontSize: 13, color: C.subtle, fontStyle: "italic" },
})
