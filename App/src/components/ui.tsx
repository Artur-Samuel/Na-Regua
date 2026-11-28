// src/components/ui.tsx
// Peças pequenas de interface compartilhadas: Card, Avatar, EmptyState, Skeleton, Badge.
import { ReactNode, useEffect } from "react"
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native"
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { C, R, sombra } from "../theme"
import { Icon, IconName } from "./Icon"
import { PressableScale } from "./PressableScale"

/* ── Entrada escalonada de listas (limita o atraso para listas longas) ── */
export function entradaLista(index: number) {
  return FadeInDown.delay(Math.min(index, 8) * 45).duration(320)
}

/* ── Card ── */
export function Card({
  children, onPress, style,
}: { children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[s.card, style]} accessibilityRole="button">
        {children}
      </PressableScale>
    )
  }
  return <View style={[s.card, style]}>{children}</View>
}

/* ── Avatar: foto (URL pronta, ver fotoUrl) ou inicial do nome ── */
export function Avatar({ nome, size = 44, cor = C.accent, fundo = C.accentLight, foto }: {
  nome: string; size?: number; cor?: string; fundo?: string; foto?: string | null
}) {
  if (foto) {
    return <Image source={{ uri: foto }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fundo }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fundo, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: size * 0.42, fontWeight: "800", color: cor }}>
        {(nome || "?").trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  )
}

/* ── Selo ── */
export function Badge({ label, cor = C.accent, fundo = C.accentLight, icon }: {
  label: string; cor?: string; fundo?: string; icon?: IconName
}) {
  return (
    <View style={[s.badge, { backgroundColor: fundo }]}>
      {icon ? <Icon name={icon} size={12} color={cor} /> : null}
      <Text style={[s.badgeText, { color: cor }]}>{label}</Text>
    </View>
  )
}

/* ── Estado vazio ── */
export function EmptyState({ icon, title, text, action }: {
  icon: IconName; title: string; text?: string; action?: ReactNode
}) {
  return (
    <Animated.View entering={FadeInDown.duration(320)} style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={30} color={C.accent} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {text ? <Text style={s.emptyText}>{text}</Text> : null}
      {action ? <View style={{ marginTop: 8, alignSelf: "stretch" }}>{action}</View> : null}
    </Animated.View>
  )
}

/* ── Skeleton (bloco pulsando enquanto carrega) ── */
export function Skeleton({ height = 16, width = "100%", radius = R.sm, style }: {
  height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle>
}) {
  const reduzir = useReducedMotion()
  const op = useSharedValue(0.55)
  useEffect(() => {
    if (!reduzir) op.value = withRepeat(withTiming(1, { duration: 750 }), -1, true)
  }, [reduzir])
  const anim = useAnimatedStyle(() => ({ opacity: op.value }))
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: C.border }, anim, style]} />
}

/** Card de lista "fantasma": avatar + duas linhas. */
export function SkeletonCard() {
  return (
    <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 }]}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="85%" height={11} />
      </View>
    </View>
  )
}

/** Aviso inline (informação, alerta ou erro). */
export function Aviso({ icon = "information-circle", texto, tipo = "info", onPress }: {
  icon?: IconName; texto: string; tipo?: "info" | "alerta" | "erro"; onPress?: () => void
}) {
  const cores = {
    info:   { fg: C.accentDark, bg: C.accentLight },
    alerta: { fg: "#92400E", bg: C.warningLight },
    erro:   { fg: C.error, bg: C.errorLight },
  }[tipo]
  const conteudo = (
    <>
      <Icon name={icon} size={18} color={cores.fg} />
      <Text style={[s.avisoText, { color: cores.fg }]}>{texto}</Text>
      {onPress ? <Icon name="chevron-forward" size={16} color={cores.fg} /> : null}
    </>
  )
  return onPress ? (
    <PressableScale onPress={onPress} style={[s.aviso, { backgroundColor: cores.bg }]}>{conteudo}</PressableScale>
  ) : (
    <View style={[s.aviso, { backgroundColor: cores.bg }]}>{conteudo}</View>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 16,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyIcon: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: C.accentLight,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.text, textAlign: "center" },
  emptyText: { fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 20 },
  aviso: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: R.md, padding: 12 },
  avisoText: { flex: 1, fontSize: 13, fontWeight: "600", lineHeight: 18 },
})
