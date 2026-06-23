import { useEffect, useRef, useState } from "react"
import {
    Animated,
    FlatList,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { API_URL } from "../services/api"

type Barbearia = {
  barbeariaId: number
  nome: string
  latitude: number
  longitude: number
  avaliacao?: number
  distancia?: string
  especialidade?: string
}

/* ── Paleta ── */
const C = {
  bg: "#F8F7F4",
  card: "#FFFFFF",
  accent: "#2563EB",
  accentLight: "#DBEAFE",
  accentDark: "#1D4ED8",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  tag: "#F3F4F6",
  star: "#F59E0B",
}

/* ── Categoria chips ── */
const CATEGORIAS = ["Todos", "Próximos", "Bem avaliados", "Clássico", "Moderno"]

function StarRating({ rating = 4.5 }: { rating?: number }) {
  return (
    <View style={s.stars}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={[s.star, { opacity: i <= Math.round(rating) ? 1 : 0.3 }]}>
          ★
        </Text>
      ))}
      <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  )
}

function BarberCard({
  item,
  index,
}: {
  item: Barbearia
  index: number
}) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: index * 80,
      useNativeDriver: true,
    }).start()
  }, [])

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity activeOpacity={0.85} style={s.card}>
        {/* Faixa colorida lateral */}
        <View style={s.cardAccent} />

        <View style={s.cardBody}>
          {/* Avatar inicial */}
          <View style={s.avatar}>
            <Text style={s.avatarText}>{item.nome.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={s.cardInfo}>
            <Text style={s.cardName} numberOfLines={1}>
              {item.nome}
            </Text>

            <StarRating rating={item.avaliacao ?? 4.5} />

            <View style={s.tagsRow}>
              <View style={s.tag}>
                <Text style={s.tagText}>📍 {item.distancia ?? "~1,2 km"}</Text>
              </View>
              <View style={s.tag}>
                <Text style={s.tagText}>{item.especialidade ?? "Corte & Barba"}</Text>
              </View>
            </View>
          </View>

          {/* Seta */}
          <View style={s.arrow}>
            <Text style={s.arrowText}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function Home() {
  const insets = useSafeAreaInsets()
  const [barbearias, setBarbearias] = useState<Barbearia[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [activeCategory, setActiveCategory] = useState("Todos")
  const fadeAnim = useRef(new Animated.Value(0)).current

  async function load() {
    const res = await fetch(`${API_URL}/get_barbershops.php`)
    const data = await res.json()
    if (data.status === "success") {
      setBarbearias(data.barbearias)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start()
    }
  }

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <FlatList
        data={barbearias}
        keyExtractor={(item) => String(item.barbeariaId)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
        /* ── Header ── */
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Saudação */}
            <View style={s.headerRow}>
              <View>
                <Text style={s.greeting}>Olá 👋</Text>
                <Text style={s.subtitle}>Encontre sua barbearia</Text>
              </View>
              <TouchableOpacity style={s.notifBtn}>
                <Text style={s.notifIcon}>🔔</Text>
              </TouchableOpacity>
            </View>

            {/* Barra de busca decorativa */}
            <TouchableOpacity style={s.searchBar} activeOpacity={0.7}>
              <Text style={s.searchIcon}>🔍</Text>
              <Text style={s.searchPlaceholder}>Buscar barbearia...</Text>
            </TouchableOpacity>

            {/* Mapa */}
            <View style={s.mapWrapper}>
              <MapView
                style={s.map}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: -23.5505,
                  longitude: -46.6333,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {barbearias.map((item) => (
                  <Marker
                    key={item.barbeariaId}
                    coordinate={{
                      latitude: Number(item.latitude),
                      longitude: Number(item.longitude),
                    }}
                    title={item.nome}
                    pinColor={C.accent}
                  />
                ))}
              </MapView>

              {/* Badge por cima do mapa */}
              <View style={s.mapBadge}>
                <Text style={s.mapBadgeText}>
                  {barbearias.length} barbearia{barbearias.length !== 1 ? "s" : ""} próximas
                </Text>
              </View>
            </View>

            {/* Chips de categoria */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}
            >
              {CATEGORIAS.map((cat) => {
                const active = cat === activeCategory
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={[s.chip, active && s.chipActive]}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{cat}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {/* Título da lista */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recomendados</Text>
              <TouchableOpacity>
                <Text style={s.seeAll}>Ver todos</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        renderItem={({ item, index }) => <BarberCard item={item} index={index} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>✂️</Text>
            <Text style={s.emptyText}>Nenhuma barbearia encontrada</Text>
          </View>
        }
      />
    </View>
  )
}

/* ────────────────────────────── styles ── */
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 20,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notifIcon: {
    fontSize: 18,
  },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: C.muted,
  },

  /* Mapa */
  mapWrapper: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  map: {
    width: "100%",
    height: 200,
  },
  mapBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.accent,
  },

  /* Chips */
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.tag,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.muted,
  },
  chipTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    color: C.accent,
    fontWeight: "600",
  },

  /* Card */
  card: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardAccent: {
    width: 5,
    backgroundColor: C.accent,
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: C.accent,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.2,
  },

  /* Stars */
  stars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  star: {
    fontSize: 12,
    color: C.star,
  },
  ratingText: {
    fontSize: 12,
    color: C.muted,
    marginLeft: 4,
    fontWeight: "600",
  },

  /* Tags */
  tagsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginTop: 2,
  },
  tag: {
    backgroundColor: C.tag,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500",
  },

  /* Arrow */
  arrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 20,
    color: C.accent,
    lineHeight: 24,
  },

  /* Empty */
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "500",
  },
})