import * as Location from "expo-location"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import Estrelas, { formatarMedia } from "../../components/Estrelas"
import { Icon, IconName } from "../../components/Icon"
import { Logo } from "../../components/Logo"
import MapaLeaflet, { MapaLeafletRef, PontoMapa } from "../../components/MapaLeaflet"
import { PressableScale } from "../../components/PressableScale"
import { Avatar, Aviso, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import { fotoUrl, getAvaliacoesPendentes, getBarbershops, getUser } from "../../services/api"
import { C, MOTION, R, sombra } from "../../theme"
import { primeiroNome } from "../../utils/format"
import { haptic } from "../../utils/haptics"

type Barbearia = {
  barbeariaId: number
  nome: string
  endereco: string
  cidade: string
  latitude: number | null
  longitude: number | null
  distanciaKm: number | null
  mediaAvaliacao: number | null
  totalAvaliacoes: number
  descricao: string | null
  foto: string | null
  totalBarbeiros: number
  precoMinimo: number | null
  abertoAgora: boolean
  /** Atendimentos concluídos do cliente logado nesta barbearia */
  minhasVisitas: number
  ultimaVisita: string | null
  /** Média das notas que o cliente logado deu aqui */
  minhaNota: number | null
}

type Filtro = "perto" | "avaliadas" | "frequentei"

const FILTROS: { key: Filtro; label: string; icon: IconName }[] = [
  { key: "perto", label: "Perto de mim", icon: "navigate-outline" },
  { key: "avaliadas", label: "Melhor avaliadas", icon: "star-outline" },
  { key: "frequentei", label: "Já frequentei", icon: "time-outline" },
]

/** Nulos vão para o fim em qualquer ordenação. */
function ordenar(lista: Barbearia[], filtro: Filtro) {
  const copia = [...lista]
  if (filtro === "perto") {
    return copia.sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity))
  }
  if (filtro === "avaliadas") {
    return copia.sort(
      (a, b) => (b.mediaAvaliacao ?? -1) - (a.mediaAvaliacao ?? -1) || b.totalAvaliacoes - a.totalAvaliacoes
    )
  }
  return copia
    .filter((b) => b.minhasVisitas > 0)
    .sort((a, b) => (b.ultimaVisita ?? "").localeCompare(a.ultimaVisita ?? ""))
}

type Pendente = {
  agendamentoId: number
  data: string
  nomeBarbearia: string
  nomeBarbeiro: string
}

type Posicao = { latitude: number; longitude: number }

const ALTURA_MAPA = 210

function formatarDistancia(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`
}

/** "Bom dia" até 12h, "Boa tarde" até 18h, depois "Boa noite". */
function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
}

function temCoordenada(b: Barbearia) {
  return b.latitude != null && b.longitude != null
}

/** Pede permissão e devolve a posição atual. Nunca lança erro. */
async function obterPosicao(): Promise<{ posicao: Posicao | null; negada: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") return { posicao: null, negada: true }

    const loc =
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null)) ??
      (await Location.getLastKnownPositionAsync())
    if (!loc) return { posicao: null, negada: false }

    return { posicao: { latitude: loc.coords.latitude, longitude: loc.coords.longitude }, negada: false }
  } catch {
    return { posicao: null, negada: false }
  }
}

/** Card da lista: foto (ou inicial), nome, endereço, nota e distância. */
function CardBarbearia({ b, onPress }: { b: Barbearia; onPress: () => void }) {
  return (
    <PressableScale style={s.card} onPress={onPress} accessibilityRole="button">
      <Avatar nome={b.nome} size={48} foto={fotoUrl(b.foto)} />
      <View style={{ flex: 1 }}>
        <Text style={s.cardName} numberOfLines={1}>{b.nome}</Text>
        <Text style={s.cardEndereco} numberOfLines={1}>
          {b.endereco} · {b.cidade}
        </Text>
        {b.mediaAvaliacao != null ? (
          <View style={s.cardNotaRow}>
            <Estrelas nota={b.mediaAvaliacao} tamanho={12} />
            <Text style={s.cardNota}>
              {formatarMedia(b.mediaAvaliacao)} <Text style={s.cardNotaTotal}>({b.totalAvaliacoes})</Text>
            </Text>
          </View>
        ) : (
          <Text style={s.cardSemNota}>Sem avaliações ainda</Text>
        )}
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        {b.distanciaKm != null && (
          <View style={s.distPill}>
            <Text style={s.cardDist}>{formatarDistancia(b.distanciaKm)}</Text>
          </View>
        )}
        <Icon name="chevron-forward" size={18} color={C.subtle} />
      </View>
    </PressableScale>
  )
}

export default function Home() {
  const insets = useSafeAreaInsets()
  const mapaRef = useRef<MapaLeafletRef>(null)

  const [nomeUsuario, setNomeUsuario] = useState("")
  const [fotoUsuario, setFotoUsuario] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<Filtro>("perto")
  const [barbearias, setBarbearias] = useState<Barbearia[]>([])
  const [busca, setBusca] = useState("")
  const [posicao, setPosicao] = useState<Posicao | null>(null)
  const [localizacaoNegada, setLocalizacaoNegada] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [pendentes, setPendentes] = useState<Pendente[]>([])
  const [mapaAberto, setMapaAberto] = useState(true)

  // Mapa recolhível: o WebView continua montado (não recarrega ao reabrir)
  const alturaMapa = useSharedValue(ALTURA_MAPA)
  const mapaStyle = useAnimatedStyle(() => ({
    height: alturaMapa.value,
    opacity: alturaMapa.value / ALTURA_MAPA,
    marginBottom: (alturaMapa.value / ALTURA_MAPA) * 12,
  }))

  function alternarMapa() {
    haptic.leve()
    const abrir = !mapaAberto
    setMapaAberto(abrir)
    alturaMapa.value = withTiming(abrir ? ALTURA_MAPA : 0, { duration: MOTION.normal })
  }

  const totalFrequentadas = useMemo(() => barbearias.filter((b) => b.minhasVisitas > 0).length, [barbearias])

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const porBusca = !t
      ? barbearias
      : barbearias.filter(
          (b) =>
            b.nome.toLowerCase().includes(t) ||
            (b.endereco ?? "").toLowerCase().includes(t) ||
            (b.cidade ?? "").toLowerCase().includes(t)
        )
    return ordenar(porBusca, filtro)
  }, [barbearias, busca, filtro])

  function escolherFiltro(f: Filtro) {
    if (f === filtro) return
    haptic.leve()
    setFiltro(f)
  }

  // Memoizado: o mapa só recebe dados novos quando a lista filtrada muda de verdade
  const pontosMapa = useMemo<PontoMapa[]>(
    () =>
      filtradas.filter(temCoordenada).map((b) => ({
        id: b.barbeariaId,
        nome: b.nome,
        subtitulo: b.distanciaKm != null ? `${formatarDistancia(b.distanciaKm)} · ${b.endereco}` : b.endereco,
        lat: b.latitude!,
        lng: b.longitude!,
      })),
    [filtradas]
  )
  const semCoordenada = barbearias.length - barbearias.filter(temCoordenada).length

  useEffect(() => { carregar() }, [])

  // Pendentes de avaliação: recarrega sempre que a home volta a aparecer
  // (ex.: o cliente acabou de avaliar e voltou)
  useFocusEffect(
    useCallback(() => {
      getUser().then((u) => {
        if (!u) return
        setNomeUsuario(u.nome)
        setFotoUsuario(fotoUrl(u.foto))
      })
      getAvaliacoesPendentes()
        .then((d) => { if (d.status === "success") setPendentes(d.pendentes) })
        .catch(() => {})
    }, [])
  )

  function abrirPendentes() {
    // Só um: vai direto para a avaliação. Vários: lista de concluídos.
    if (pendentes.length === 1) {
      const p = pendentes[0]
      router.push({
        pathname: "/cliente/avaliar",
        params: {
          agendamentoId: String(p.agendamentoId),
          nomeBarbearia: p.nomeBarbearia,
          nomeBarbeiro: p.nomeBarbeiro,
          data: p.data,
        },
      })
    } else {
      router.push({ pathname: "/cliente/meus-agendamentos", params: { aba: "concluido" } })
    }
  }

  async function carregar() {
    const user = await getUser()
    if (user) setNomeUsuario(user.nome)

    const { posicao: pos, negada } = await obterPosicao()
    setPosicao(pos)
    setLocalizacaoNegada(negada)

    try {
      const data = await getBarbershops(pos)
      if (data.status === "success") {
        setBarbearias(data.barbearias)
        setErro(null)
      } else {
        setErro(data.message ?? "Não foi possível carregar as barbearias.")
      }
    } catch {
      setErro(
        __DEV__
          ? "Sem conexão com o servidor. Verifique o XAMPP e o IP em services/api.ts."
          : "Sem conexão com o servidor. Puxe para tentar de novo."
      )
    } finally {
      setCarregando(false)
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }

  function agendar(b: Barbearia) {
    router.push({
      pathname: "/cliente/agendar",
      params: { barbeariaId: String(b.barbeariaId), nomeBarbearia: b.nome },
    })
  }

  // Um único aviso por vez, o mais importante primeiro
  const aviso = carregando
    ? null
    : localizacaoNegada
      ? { texto: "Localização desativada: as distâncias não aparecem. Toque para tentar de novo.", onPress: onRefresh }
      : !posicao
        ? {
            texto: __DEV__
              ? "Sem localização. No emulador, defina uma em Extended controls → Location. Toque para tentar de novo."
              : "Não conseguimos sua localização. Toque para tentar de novo.",
            onPress: onRefresh,
          }
        : semCoordenada > 0
          ? { texto: `${semCoordenada} barbearia${semCoordenada > 1 ? "s" : ""} sem endereço no mapa.` }
          : null

  const cabecalhoLista = (
    <>
      {/* ── Filtros (altura fixa: ScrollView horizontal sem altura definida corta os chips) ── */}
      <View style={s.filtrosWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtros}>
          {FILTROS.map((f) => {
            const ativo = filtro === f.key
            return (
              <PressableScale
                key={f.key}
                style={[s.chip, ativo && s.chipAtivo]}
                onPress={() => escolherFiltro(f.key)}
                scaleTo={0.94}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativo }}
              >
                <Icon name={f.icon} size={14} color={ativo ? "#FFF" : C.muted} />
                <Text style={[s.chipText, ativo && s.chipTextAtivo]}>{f.label}</Text>
                {f.key === "frequentei" && totalFrequentadas > 0 && (
                  <View style={[s.chipConta, ativo && s.chipContaAtiva]}>
                    <Text style={[s.chipContaText, ativo && { color: C.accent }]}>{totalFrequentadas}</Text>
                  </View>
                )}
              </PressableScale>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Avaliações pendentes ── */}
      {pendentes.length > 0 && (
        <Animated.View entering={FadeInDown.duration(320)} style={{ marginBottom: 12 }}>
          <PressableScale style={s.pendenteBanner} onPress={abrirPendentes}>
            <View style={s.pendenteIcon}>
              <Icon name="star" size={16} color="#FFF" />
            </View>
            <Text style={s.pendenteText}>
              {pendentes.length === 1
                ? `Como foi na ${pendentes[0].nomeBarbearia}? Avalie seu atendimento.`
                : `Você tem ${pendentes.length} atendimentos não avaliados.`}
            </Text>
            <Icon name="chevron-forward" size={18} color={C.warning} />
          </PressableScale>
        </Animated.View>
      )}

      {aviso && (
        <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 12 }}>
          <Aviso icon="location-outline" texto={aviso.texto} onPress={aviso.onPress} />
        </Animated.View>
      )}

      <Text style={s.sectionTitle}>
        {busca
          ? `Resultados (${filtradas.length})`
          : filtro === "avaliadas"
            ? "Melhor avaliadas"
            : filtro === "frequentei"
              ? "Onde você já cortou"
              : posicao ? "Mais perto de você" : "Barbearias"}
      </Text>
    </>
  )

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Cabeçalho ── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Logo variante="nome" altura={16} style={{ marginBottom: 10 }} />
          <Text style={s.saudacao}>
            {saudacao()}{nomeUsuario ? `, ${primeiroNome(nomeUsuario)}` : ""}
          </Text>
          <Text style={s.titulo}>Encontre sua barbearia</Text>
        </View>
        <PressableScale
          onPress={() => router.push("/cliente/perfil")}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Meu perfil"
        >
          <Avatar nome={nomeUsuario || "?"} size={42} foto={fotoUsuario} />
        </PressableScale>
      </View>

      {/* ── Busca + botão do mapa ── */}
      <View style={s.searchRow}>
        <View style={s.searchBar}>
          <Icon name="search" size={18} color={C.subtle} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar por nome, rua ou cidade"
            placeholderTextColor={C.subtle}
            value={busca}
            onChangeText={setBusca}
            autoCorrect={false}
            returnKeyType="search"
          />
          {busca.length > 0 && (
            <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)}>
              <PressableScale onPress={() => setBusca("")} hitSlop={10} scaleTo={0.85} accessibilityLabel="Limpar busca">
                <Icon name="close-circle" size={18} color={C.subtle} />
              </PressableScale>
            </Animated.View>
          )}
        </View>
        <PressableScale
          style={[s.mapToggle, mapaAberto && s.mapToggleAtivo]}
          onPress={alternarMapa}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel={mapaAberto ? "Esconder mapa" : "Mostrar mapa"}
        >
          <Icon name={mapaAberto ? "map" : "map-outline"} size={20} color={mapaAberto ? "#FFF" : C.accent} />
        </PressableScale>
      </View>

      {/* ── Mapa (fora da lista, para o arrasto mexer no mapa e não rolar a tela) ── */}
      <Animated.View style={[s.mapWrapper, mapaStyle]} pointerEvents={mapaAberto ? "auto" : "none"}>
        <MapaLeaflet
          ref={mapaRef}
          pontos={pontosMapa}
          usuario={posicao}
          onAgendar={(id) => {
            const b = barbearias.find((x) => x.barbeariaId === id)
            if (b) agendar(b)
          }}
        />
        {posicao && (
          <PressableScale
            style={s.mapBtn}
            onPress={() => mapaRef.current?.centralizarUsuario()}
            scaleTo={0.88}
            accessibilityLabel="Centralizar na minha posição"
          >
            <Icon name="locate" size={20} color={C.accent} />
          </PressableScale>
        )}
      </Animated.View>

      {/* ── Lista ── */}
      {carregando ? (
        <View style={s.list}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(b) => String(b.barbeariaId)}
          contentContainerStyle={[s.list, { paddingBottom: 100 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} tintColor={C.accent} />}
          ListHeaderComponent={cabecalhoLista}
          renderItem={({ item, index }) => (
            <Animated.View entering={entradaLista(index)}>
              <CardBarbearia b={item} onPress={() => agendar(item)} />
            </Animated.View>
          )}
          ListEmptyComponent={
            erro ? (
              <EmptyState icon="cloud-offline-outline" title="Algo deu errado" text={erro} />
            ) : filtro === "frequentei" && !busca ? (
              <EmptyState
                icon="time-outline"
                title="Nenhum corte por aqui ainda"
                text="Depois do seu primeiro atendimento concluído, a barbearia aparece neste filtro."
              />
            ) : busca ? (
              <EmptyState icon="search-outline" title="Nada encontrado" text={`Nenhuma barbearia para "${busca}".`} />
            ) : (
              <EmptyState icon="storefront-outline" title="Nenhuma barbearia ainda" text="Assim que alguma se cadastrar, ela aparece aqui." />
            )
          }
        />
      )}

      {/* ── Meus agendamentos (botão flutuante) ── */}
      <Animated.View
        entering={FadeInDown.delay(250).duration(350)}
        style={[s.fabWrap, { bottom: 16 + insets.bottom }]}
        pointerEvents="box-none"
      >
        <PressableScale style={s.fab} onPress={() => router.push("/cliente/meus-agendamentos")} haptic>
          <Icon name="calendar" size={18} color="#FFF" />
          <Text style={s.fabText}>Meus agendamentos</Text>
        </PressableScale>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, marginBottom: 16 },
  saudacao: { fontSize: 14, color: C.muted },
  titulo: { fontSize: 24, fontWeight: "800", color: C.text, letterSpacing: -0.5, marginTop: 2 },

  pendenteBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 12,
    backgroundColor: C.warningLight, borderRadius: R.md, borderWidth: 1, borderColor: "#FDE68A",
  },
  pendenteIcon: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.star,
    alignItems: "center", justifyContent: "center",
  },
  pendenteText: { flex: 1, fontSize: 13, fontWeight: "600", color: "#92400E", lineHeight: 18 },

  searchRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 12 },
  searchBar: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12,
  },
  searchInput: { flex: 1, height: 46, fontSize: 14, color: C.text },
  mapToggle: {
    width: 46, height: 46, borderRadius: R.md, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card, alignItems: "center", justifyContent: "center",
  },
  mapToggleAtivo: { backgroundColor: C.accent, borderColor: C.accent },

  mapWrapper: {
    marginHorizontal: 20, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.border,
  },
  mapBtn: {
    position: "absolute", right: 10, bottom: 10, width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", ...sombra(2),
  },

  list: { paddingHorizontal: 20, paddingTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: C.text, marginBottom: 10, letterSpacing: -0.3 },

  // Sangra até as bordas da tela (a lista tem paddingHorizontal 20)
  filtrosWrap: { height: 36, marginHorizontal: -20, marginBottom: 14 },
  filtros: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14,
    borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
  chipAtivo: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 13, fontWeight: "600", color: C.muted },
  chipTextAtivo: { color: "#FFF" },
  chipConta: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center",
  },
  chipContaAtiva: { backgroundColor: "#FFF" },
  chipContaText: { fontSize: 11, fontWeight: "800", color: C.accentDark },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.card,
    borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 12, marginBottom: 10, ...sombra(1),
  },
  cardName: { fontSize: 15, fontWeight: "700", color: C.text },
  cardEndereco: { fontSize: 12, color: C.muted, marginTop: 2 },
  cardNotaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 },
  cardNota: { fontSize: 12, fontWeight: "700", color: C.text },
  cardNotaTotal: { fontWeight: "400", color: C.muted },
  cardSemNota: { fontSize: 11, color: C.subtle, marginTop: 5 },
  distPill: { backgroundColor: C.accentLight, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 3 },
  cardDist: { fontSize: 12, fontWeight: "700", color: C.accentDark },

  fabWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fab: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.text, paddingHorizontal: 22, paddingVertical: 14, borderRadius: R.pill, ...sombra(3),
  },
  fabText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
})
