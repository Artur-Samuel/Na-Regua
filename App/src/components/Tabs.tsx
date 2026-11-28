// src/components/Tabs.tsx
// Abas em "pílula" com indicador que desliza (mola) até a aba ativa.
import { useEffect, useState } from "react"
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

import { C, MOTION, R, sombra } from "../theme"
import { haptic } from "../utils/haptics"

type Props<T extends string> = {
  abas: { key: T; label: string; badge?: number }[]
  ativa: T
  onChange: (key: T) => void
}

export function Tabs<T extends string>({ abas, ativa, onChange }: Props<T>) {
  const [largura, setLargura] = useState(0)
  const x = useSharedValue(0)
  const indice = Math.max(0, abas.findIndex((a) => a.key === ativa))

  useEffect(() => {
    if (largura) x.value = withSpring(indice * largura, MOTION.mola)
  }, [indice, largura])

  const indicador = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  function onLayout(e: LayoutChangeEvent) {
    const w = (e.nativeEvent.layout.width - 8) / abas.length
    setLargura(w)
    x.value = indice * w
  }

  return (
    <View style={s.tabs} onLayout={onLayout} accessibilityRole="tablist">
      {largura > 0 && <Animated.View style={[s.indicador, { width: largura }, indicador]} />}
      {abas.map((aba) => {
        const sel = ativa === aba.key
        return (
          <Pressable
            key={aba.key}
            style={s.tab}
            onPress={() => { if (!sel) { haptic.leve(); onChange(aba.key) } }}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
          >
            <Text style={[s.tabText, sel && s.tabTextAtivo]}>{aba.label}</Text>
            {aba.badge ? (
              <View style={s.badge}><Text style={s.badgeText}>{aba.badge}</Text></View>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )
}

const s = StyleSheet.create({
  tabs: {
    flexDirection: "row", marginHorizontal: 20, marginBottom: 8, padding: 4,
    backgroundColor: C.border, borderRadius: R.md,
  },
  indicador: {
    position: "absolute", top: 4, bottom: 4, left: 4,
    backgroundColor: C.card, borderRadius: R.sm, ...sombra(1),
  },
  tab: { flex: 1, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabText: { fontSize: 13, fontWeight: "600", color: C.muted },
  tabTextAtivo: { color: C.text, fontWeight: "700" },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFF" },
})
