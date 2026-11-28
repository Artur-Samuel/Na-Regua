// src/components/Header.tsx
// Cabeçalho das telas internas: voltar, título centralizado e um slot à direita.
import { router } from "expo-router"
import { ReactNode } from "react"
import { StyleSheet, Text, View } from "react-native"

import { C } from "../theme"
import { Icon } from "./Icon"
import { PressableScale } from "./PressableScale"

type Props = {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}

export function Header({ title, subtitle, onBack, right }: Props) {
  return (
    <View style={s.header}>
      <PressableScale
        style={s.lado}
        scaleTo={0.9}
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <View style={s.backCircle}>
          <Icon name="chevron-back" size={20} color={C.text} />
        </View>
      </PressableScale>

      <View style={s.centro}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={[s.lado, { alignItems: "flex-end" }]}>{right}</View>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  lado: { width: 44 },
  backCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  centro: { flex: 1, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "700", color: C.text },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 1 },
})
