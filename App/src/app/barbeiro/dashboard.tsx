import AsyncStorage from "@react-native-async-storage/async-storage"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import Estrelas, { formatarMedia } from "../../components/Estrelas"
import { Icon, IconName } from "../../components/Icon"
import { Logo } from "../../components/Logo"
import { PressableScale } from "../../components/PressableScale"
import { Avatar, Badge, Skeleton } from "../../components/ui"
import {
  fotoUrl,
  chaveAvaliacaoVista,
  getAgendamentosBarbeiro,
  getAvaliacoesBarbearia,
  getBarbeiroByUserId,
  getConvites,
  getRelatorioFinanceiro,
  getUser,
  removeUser,
} from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarData, formatarMoeda, nomeMes, primeiroNome, toISODate, toISOMes } from "../../utils/format"

type Avaliacao = {
  avaliacaoId: number
  nota: number
  comentario: string | null
  criadoEm: string
  nomeCliente: string
  nomeBarbeiro: string
}

type ResumoAvaliacoes = { total: number; media: number | null }

type Barbearia = {
  barbeariaId: number
  barbeiroId: number
  nome: string
  descricao: string
  endereco: string
  cidade: string
  telefone: string
  foto: string | null
  latitude: number
  longitude: number
  criadoEm: string
}

const entrada = (i: number) => FadeInDown.delay(i * 60).duration(380)

function StatCard({ icon, label, value, cor }: { icon: IconName; label: string; value: string; cor: string }) {
  return (
    <View style={s.statCard}>
      <View style={[s.statIcon, { backgroundColor: cor + "1A" }]}>
        <Icon name={icon} size={16} color={cor} />
      </View>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

function Atalho({ icon, titulo, sub, onPress, badge }: {
  icon: IconName; titulo: string; sub: string; onPress: () => void; badge?: string
}) {
  return (
    <PressableScale style={s.atalho} onPress={onPress} accessibilityRole="button">
      <View style={s.atalhoTopo}>
        <View style={s.atalhoIcon}><Icon name={icon} size={20} color={C.accent} /></View>
        {badge ? <Badge label={badge} cor="#FFF" fundo={C.accent} /> : null}
      </View>
      <Text style={s.atalhoTitulo}>{titulo}</Text>
      <Text style={s.atalhoSub}>{sub}</Text>
    </PressableScale>
  )
}

export default function Dashboard() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [convitesPendentes, setConvitesPendentes] = useState(0)
  const [souDono, setSouDono] = useState(false)
  const [resumo, setResumo] = useState<ResumoAvaliacoes | null>(null)
  const [recentes, setRecentes] = useState<Avaliacao[]>([])
  const [novas, setNovas] = useState(0)
  const [agenda, setAgenda] = useState<{ hoje: number; proximos: number } | null>(null)
  const [financeiro, setFinanceiro] = useState<{ faturamento: number; concluidos: number } | null>(null)

  async function checkBarbershop() {
    try {
      const user = await getUser()
      if (!user) { router.replace("/auth"); return }

      setNomeUsuario(user.nome)

      // Uma única chamada: perfil do barbeiro + barbearia vinculada (dono ou funcionário)
      const data = await getBarbeiroByUserId(user.id)
      if (data.status !== "success") {
        setBarbearia(null)
        return
      }

      if (data.barbearia) {
        setBarbearia(data.barbearia)
        setSouDono(data.barbeiro.souDono === true)
      } else {
        // Sem vínculo: conta os convites pendentes para o badge
        setBarbearia(null)
        const cData = await getConvites({ barbeiroId: data.barbeiro.barbeiroId, tipo: "recebidos" })
        if (cData.status === "success") {
          setConvitesPendentes(cData.convites.length)
        }
      }
    } catch (err: any) {
      if (__DEV__) console.warn("Erro ao buscar barbearia:", err)
      setBarbearia(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await removeUser()
    router.replace("/auth")
  }

  useEffect(() => { checkBarbershop() }, [])

  // Avaliações e agenda: recarregam sempre que o dashboard volta a aparecer
  // (assim o selo "novas" some depois de abrir a tela de avaliações)
  const barbeariaId = barbearia?.barbeariaId
  useFocusEffect(
    useCallback(() => {
      if (barbeariaId) {
        carregarAvaliacoes(barbeariaId)
        carregarAgenda()
        carregarFinanceiro()
      }
    }, [barbeariaId])
  )

  async function carregarFinanceiro() {
    try {
      const d = await getRelatorioFinanceiro(toISOMes(new Date()))
      if (d.status === "success") setFinanceiro(d.resumo)
    } catch {
      // sem relatório não impede o dashboard
    }
  }

  async function carregarAvaliacoes(id: number) {
    try {
      const d = await getAvaliacoesBarbearia(20)
      if (d.status !== "success") return
      setResumo(d.resumo)
      setRecentes(d.avaliacoes.slice(0, 3))
      const vista = Number((await AsyncStorage.getItem(chaveAvaliacaoVista(id))) ?? 0)
      setNovas(d.avaliacoes.filter((a: Avaliacao) => a.avaliacaoId > vista).length)
    } catch {
      // sem avaliações não impede o dashboard
    }
  }

  async function carregarAgenda() {
    try {
      const d = await getAgendamentosBarbeiro(undefined, "confirmado")
      if (d.status !== "success") return
      const hoje = toISODate(new Date())
      setAgenda({
        hoje: d.agendamentos.filter((a: { data: string }) => a.data === hoje).length,
        proximos: d.agendamentos.length,
      })
    } catch {
      // sem agenda não impede o dashboard
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await checkBarbershop()
    if (barbeariaId) await Promise.all([carregarAvaliacoes(barbeariaId), carregarAgenda(), carregarFinanceiro()])
    setRefreshing(false)
  }

  /* ── Carregando ── */
  if (loading) {
    return (
      <View style={[s.root, s.scroll, { paddingTop: insets.top + 20, gap: 16 }]}>
        <Skeleton width="55%" height={28} />
        <Skeleton height={150} radius={R.lg} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} width="31%" height={90} radius={R.lg} />)}
        </View>
        <Skeleton height={110} radius={R.lg} />
      </View>
    )
  }

  /* ── Sem barbearia ── */
  if (!barbearia) {
    return (
      <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={s.emptyScreen}>
          <Animated.View entering={entrada(0)} style={s.emptyIcon}>
            <Icon name="storefront" size={40} color={C.accent} />
          </Animated.View>
          <Animated.Text entering={entrada(1)} style={s.emptyTitle}>Olá, {primeiroNome(nomeUsuario)}!</Animated.Text>
          <Animated.Text entering={entrada(2)} style={s.emptyText}>
            Cadastre sua barbearia para começar a receber agendamentos, ou entre na equipe de uma barbearia que te convidou.
          </Animated.Text>

          <Animated.View entering={entrada(3)} style={s.emptyBotoes}>
            <Button label="Criar minha barbearia" icon="add-circle-outline" onPress={() => router.push("/create-barbershop")} />
            <PressableScale style={s.btnConvites} onPress={() => router.push("/barbeiro/convites-barbeiro")}>
              <Icon name="mail-outline" size={18} color={C.accent} />
              <Text style={s.btnConvitesText}>Ver convites recebidos</Text>
              {convitesPendentes > 0 && <Badge label={String(convitesPendentes)} cor="#FFF" fundo={C.accent} />}
            </PressableScale>
            <Button label="Sair" variant="ghost" icon="log-out-outline" onPress={handleLogout} style={{ marginTop: 4 }} />
          </Animated.View>
        </View>
      </View>
    )
  }

  /* ── Dashboard ── */
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} tintColor={C.accent} />}
      >
        {/* Cabeçalho */}
        <Animated.View entering={entrada(0)} style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Logo variante="nome" altura={16} style={{ marginBottom: 12 }} />
            <Text style={s.pageSubtitle}>Olá, {primeiroNome(nomeUsuario)} 👋</Text>
            <Text style={s.pageTitle}>Seu painel</Text>
          </View>
          <PressableScale
            style={s.logoutBtn}
            onPress={handleLogout}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Sair"
          >
            <Icon name="log-out-outline" size={20} color={C.muted} />
          </PressableScale>
        </Animated.View>

        {/* Barbearia (cartão de destaque) */}
        <Animated.View entering={entrada(1)} style={s.hero}>
          <View style={s.heroTopo}>
            <Avatar nome={barbearia.nome} size={52} cor="#FFF" fundo="rgba(255,255,255,0.15)" foto={fotoUrl(barbearia.foto)} />
            <View style={{ flex: 1 }}>
              <Text style={s.heroNome} numberOfLines={1}>{barbearia.nome}</Text>
              <View style={s.heroLinha}>
                <Icon name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroCidade} numberOfLines={1}>{barbearia.endereco} · {barbearia.cidade}</Text>
              </View>
            </View>
          </View>
          <View style={s.heroRodape}>
            <View style={s.papel}>
              <Icon name={souDono ? "ribbon" : "person"} size={12} color="#FFF" />
              <Text style={s.papelText}>{souDono ? "Proprietário" : "Funcionário"}</Text>
            </View>
            {souDono && (
              <PressableScale style={s.heroEditar} onPress={() => router.push("/barbeiro/edit-barbershop")} scaleTo={0.94}>
                <Icon name="create-outline" size={15} color={C.text} />
                <Text style={s.heroEditarText}>Editar</Text>
              </PressableScale>
            )}
          </View>
        </Animated.View>

        {/* Números */}
        <Animated.View entering={entrada(2)} style={s.statsRow}>
          <StatCard icon="today-outline" label="Hoje" value={agenda ? String(agenda.hoje) : "–"} cor={C.accent} />
          <StatCard icon="calendar-outline" label="Próximos" value={agenda ? String(agenda.proximos) : "–"} cor={C.success} />
          <StatCard
            icon="star"
            label={resumo?.total ? `${resumo.total} avaliaç${resumo.total === 1 ? "ão" : "ões"}` : "Avaliação"}
            value={resumo?.media != null ? formatarMedia(resumo.media) : "–"}
            cor={C.star}
          />
        </Animated.View>

        {/* Financeiro do mês */}
        <Animated.View entering={entrada(3)}>
          <PressableScale style={s.financeiro} onPress={() => router.push("/barbeiro/financeiro")} accessibilityRole="button">
            <View style={[s.statIcon, { backgroundColor: C.success + "1A", width: 44, height: 44, borderRadius: 13 }]}>
              <Icon name="trending-up" size={22} color={C.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.financeiroLabel}>
                Faturamento{souDono ? " da barbearia" : ""} · {nomeMes(toISOMes(new Date())).split(" ")[0]}
              </Text>
              <Text style={s.financeiroValor}>{financeiro ? formatarMoeda(financeiro.faturamento) : "–"}</Text>
              <Text style={s.financeiroSub}>
                {financeiro ? `${financeiro.concluidos} concluído${financeiro.concluidos === 1 ? "" : "s"} · ver relatório` : "Ver relatório"}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={C.subtle} />
          </PressableScale>
        </Animated.View>

        {/* Atalhos */}
        <Animated.View entering={entrada(4)}>
          <Text style={s.secao}>Gerenciar</Text>
          <View style={s.atalhos}>
            <Atalho
              icon="calendar"
              titulo="Agendamentos"
              sub="Atendimentos marcados"
              badge={agenda?.hoje ? `${agenda.hoje} hoje` : undefined}
              onPress={() => router.push("/barbeiro/agendamentos-barbeiro")}
            />
            <Atalho icon="cut" titulo="Serviços" sub="Preços e duração" onPress={() => router.push("/barbeiro/servicos")} />
            <Atalho icon="time" titulo="Jornada" sub="Horários de trabalho" onPress={() => router.push("/barbeiro/jornada")} />
            {souDono ? (
              <Atalho icon="people" titulo="Equipe" sub="Convide barbeiros" onPress={() => router.push("/barbeiro/convites-dono")} />
            ) : null}
          </View>
        </Animated.View>

        {/* Avaliações recentes */}
        <Animated.View entering={entrada(5)}>
          <PressableScale
            style={s.card}
            onPress={() => router.push({ pathname: "/barbeiro/avaliacoes", params: { barbeariaId: String(barbearia.barbeariaId) } })}
            accessibilityRole="button"
          >
            <View style={s.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={s.cardTitle}>Avaliações recentes</Text>
                {novas > 0 && <Badge label={`${novas >= 20 ? "20+" : novas} nova${novas > 1 ? "s" : ""}`} cor="#FFF" fundo={C.accent} />}
              </View>
              <Icon name="chevron-forward" size={18} color={C.subtle} />
            </View>

            {recentes.length === 0 ? (
              <Text style={s.cardText}>Nenhuma avaliação ainda. Elas aparecem aqui quando os clientes avaliarem atendimentos concluídos.</Text>
            ) : (
              recentes.map((a) => (
                <View key={a.avaliacaoId} style={s.avItem}>
                  <View style={s.avTopo}>
                    <Estrelas nota={a.nota} tamanho={13} />
                    <Text style={s.avMeta}>{a.nomeCliente} · {formatarData(a.criadoEm)}</Text>
                  </View>
                  {a.comentario ? <Text style={s.avComentario} numberOfLines={2}>{a.comentario}</Text> : null}
                </View>
              ))
            )}
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 16 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  pageSubtitle: { fontSize: 14, color: C.muted },
  pageTitle: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -0.6 },
  logoutBtn: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
  },

  hero: { backgroundColor: C.text, borderRadius: R.lg + 4, padding: 18, marginBottom: 14, ...sombra(3) },
  heroTopo: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroNome: { fontSize: 19, fontWeight: "800", color: "#FFF", letterSpacing: -0.3 },
  heroLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  heroCidade: { flex: 1, fontSize: 12, color: "rgba(255,255,255,0.7)" },
  heroRodape: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  papel: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 5,
  },
  papelText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
  heroEditar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF", borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 8,
  },
  heroEditarText: { fontSize: 13, fontWeight: "700", color: C.text },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  financeiro: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card, borderRadius: R.lg,
    padding: 14, marginBottom: 22, borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  financeiroLabel: { fontSize: 12, color: C.muted, fontWeight: "600" },
  financeiroValor: { fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.5, marginTop: 1 },
  financeiroSub: { fontSize: 12, color: C.success, fontWeight: "600", marginTop: 1 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 12, gap: 6,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: "600" },

  secao: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 10, letterSpacing: -0.3 },
  atalhos: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  atalho: {
    width: "48.5%", backgroundColor: C.card, borderRadius: R.lg, padding: 14, gap: 2,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  atalhoTopo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  atalhoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center" },
  atalhoTitulo: { fontSize: 15, fontWeight: "700", color: C.text },
  atalhoSub: { fontSize: 12, color: C.muted },

  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.border, ...sombra(1) },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  cardText: { fontSize: 13, color: C.muted, lineHeight: 20 },
  avItem: { paddingTop: 10, marginTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
  avTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  avMeta: { fontSize: 11, color: C.muted },
  avComentario: { fontSize: 13, color: C.text, lineHeight: 19 },

  emptyScreen: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, gap: 10 },
  emptyIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: C.accentLight,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 24, fontWeight: "800", color: C.text, textAlign: "center", letterSpacing: -0.5 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },
  emptyBotoes: { alignSelf: "stretch", gap: 10, marginTop: 18 },
  btnConvites: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: C.accent, borderRadius: R.md, height: 50,
  },
  btnConvitesText: { color: C.accent, fontWeight: "700", fontSize: 15 },
})
