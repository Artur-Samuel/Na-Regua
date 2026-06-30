import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { API_URL, getUser, removeUser } from "../services/api"

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

const C = {
  bg: "#F8F7F4", card: "#FFFFFF", accent: "#2563EB", accentLight: "#DBEAFE",
  text: "#111827", muted: "#6B7280", border: "#E5E7EB",
  success: "#16A34A", successLight: "#DCFCE7",
  warning: "#D97706", warningLight: "#FEF3C7",
}

/**
 * MySQL retorna "YYYY-MM-DD HH:MM:SS", que alguns engines de JS
 * (especialmente Android/Hermes) interpretam de forma inconsistente
 * com `new Date(string)`. Convertendo manualmente evitamos isso.
 */
function formatarData(mysqlDateTime: string | null | undefined): string {
  if (!mysqlDateTime) return ""
  const [datePart] = mysqlDateTime.split(" ")
  const [ano, mes, dia] = datePart.split("-")
  if (!ano || !mes || !dia) return ""
  return `${dia}/${mes}/${ano}`
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null
  return (
    <View style={s.infoRow}>
      <Text style={s.infoIcon}>{icon}</Text>
      <View style={s.infoTexts}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  )
}

function StatCard({ icon, label, value, color }: {
  icon: string; label: string; value: string; color: string
}) {
  return (
    <View style={[s.statCard, { borderTopColor: color }]}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  )
}

export default function Dashboard() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null)
  const [nomeUsuario, setNomeUsuario] = useState("")
  const fadeAnim = useRef(new Animated.Value(0)).current

  async function checkBarbershop() {
    try {
      const user = await getUser()

      if (!user) {
        router.replace("/")
        return
      }

      setNomeUsuario(user.nome)

      const url = `${API_URL}/get_barbershop_by_user.php?userId=${user.id}`
      const res = await fetch(url)
      const data = await res.json()

      if (data.status === "success" && data.barbearia) {
        setBarbearia(data.barbearia)
      } else {
        setBarbearia(null)
      }
    } catch (err: any) {
      if (__DEV__) console.warn("Erro ao buscar barbearia:", err)
      setBarbearia(null)
    } finally {
      setLoading(false)
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    }
  }

  async function handleLogout() {
    await removeUser()
    router.replace("/")
  }

  useEffect(() => { checkBarbershop() }, [])

  // ── loading ──
  if (loading) {
    return (
      <View style={s.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={s.loadingText}>Carregando dashboard…</Text>
      </View>
    )
  }

  // ── sem barbearia ──
  if (!barbearia) {
    return (
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.emptyScreen}>
          <Text style={s.emptyEmoji}>💈</Text>
          <Text style={s.emptyTitle}>Nenhuma barbearia ainda</Text>
          <Text style={s.emptyText}>
            Cadastre sua barbearia para começar a receber agendamentos.
          </Text>
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.push("/create-barbershop")}>
            <Text style={s.btnPrimaryText}>+ Criar minha barbearia</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={handleLogout}>
            <Text style={s.btnOutlineText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── com barbearia ──
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          <View style={s.headerRow}>
            <View>
              <Text style={s.pageTitle}>Dashboard 💈</Text>
              <Text style={s.pageSubtitle}>Olá, {nomeUsuario.split(" ")[0]}!</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <View style={[s.badge, { backgroundColor: C.successLight }]}>
                <Text style={[s.badgeText, { color: C.success }]}>● Ativa</Text>
              </View>
              <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                <Text style={s.logoutText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.statsRow}>
            <StatCard icon="📅" label="Agendamentos" value="—" color={C.accent} />
            <StatCard icon="⭐" label="Avaliação" value="—" color={C.warning} />
            <StatCard icon="👥" label="Clientes" value="—" color={C.success} />
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.avatarLarge}>
                <Text style={s.avatarText}>{barbearia.nome.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.barberName}>{barbearia.nome}</Text>
                {barbearia.cidade ? <Text style={s.barberCity}>📍 {barbearia.cidade}</Text> : null}
              </View>
            </View>

            <View style={s.divider} />

            {barbearia.descricao ? <Text style={s.description}>{barbearia.descricao}</Text> : null}

            <InfoRow icon="🏠" label="Endereço" value={barbearia.endereco} />
            <InfoRow icon="🌆" label="Cidade" value={barbearia.cidade} />
            <InfoRow icon="📞" label="Telefone" value={barbearia.telefone} />
            <InfoRow
              icon="🗓️"
              label="Cadastrada em"
              value={formatarData(barbearia.criadoEm)}
            />

            <TouchableOpacity style={s.btnPrimary} onPress={() => router.push("/")} activeOpacity={0.8}>
              <Text style={s.btnPrimaryText}>✏️ Editar barbearia</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <View style={s.cardHeaderFlat}>
              <Text style={s.cardTitle}>Agendamentos</Text>
              <View style={[s.badge, { backgroundColor: C.warningLight }]}>
                <Text style={[s.badgeText, { color: C.warning }]}>Em breve</Text>
              </View>
            </View>
            <Text style={s.cardText}>Visualize, confirme e gerencie todos os seus atendimentos.</Text>
          </View>

          <View style={s.card}>
            <View style={s.cardHeaderFlat}>
              <Text style={s.cardTitle}>Serviços</Text>
              <View style={[s.badge, { backgroundColor: C.warningLight }]}>
                <Text style={[s.badgeText, { color: C.warning }]}>Em breve</Text>
              </View>
            </View>
            <Text style={s.cardText}>Cadastre os serviços e preços para exibir no seu perfil.</Text>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, backgroundColor: C.bg },
  loadingText: { fontSize: 14, color: C.muted },
  emptyScreen: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, gap: 12 },
  emptyEmoji: { fontSize: 56, marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: C.text, textAlign: "center" },
  emptyText: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, color: C.muted, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  logoutText: { fontSize: 12, color: C.muted, fontWeight: "600" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 4, borderTopWidth: 3,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 18, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 11, color: C.muted, textAlign: "center" },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  cardHeaderFlat: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  cardText: { fontSize: 13, color: C.muted, lineHeight: 20 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 26, fontWeight: "800", color: C.accent },
  barberName: { fontSize: 18, fontWeight: "700", color: C.text, letterSpacing: -0.3 },
  barberCity: { fontSize: 13, color: C.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 14 },
  description: { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 14, fontStyle: "italic" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  infoIcon: { fontSize: 18, marginTop: 1 },
  infoTexts: { flex: 1 },
  infoLabel: { fontSize: 11, color: C.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: C.text, fontWeight: "500", marginTop: 1 },
  btnPrimary: { backgroundColor: C.accent, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 16 },
  btnPrimaryText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  btnOutline: { borderWidth: 1, borderColor: C.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnOutlineText: { color: C.muted, fontWeight: "600", fontSize: 15 },
})
