import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native"

import { C, R } from "../theme"
import { Icon, IconName } from "./Icon"
import { PressableScale } from "./PressableScale"

type Variante = "primary" | "outline" | "soft" | "danger" | "ghost"

type Props = {
  label: string
  onPress?: () => void
  variant?: Variante
  icon?: IconName
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  haptic?: boolean
}

const VARIANTES: Record<Variante, { bg: string; fg: string; borda?: string }> = {
  primary: { bg: C.accent, fg: "#FFF" },
  outline: { bg: "transparent", fg: C.text, borda: C.border },
  soft:    { bg: C.accentLight, fg: C.accentDark },
  danger:  { bg: "transparent", fg: C.error, borda: C.error },
  ghost:   { bg: "transparent", fg: C.accent },
}

export function Button({ label, onPress, variant = "primary", icon, loading, disabled, style, haptic }: Props) {
  const v = VARIANTES[variant]
  const inativo = disabled || loading

  return (
    <PressableScale
      onPress={onPress}
      disabled={inativo}
      haptic={haptic}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!loading }}
      style={[
        styles.button,
        { backgroundColor: v.bg },
        v.borda && { borderWidth: 1, borderColor: v.borda },
        disabled && !loading && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.conteudo}>
          {icon && <Icon name={icon} size={18} color={v.fg} />}
          <Text style={[styles.text, { color: v.fg }]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 50,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  conteudo: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontSize: 15, fontWeight: "700" },
})
