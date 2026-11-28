// src/theme.ts
// Fonte única de cores, espaçamentos e sombras. Toda tela importa daqui.
import { Platform, ViewStyle } from "react-native"

export const C = {
  bg: "#F8F7F4",
  card: "#FFFFFF",
  text: "#111827",
  muted: "#6B7280",
  subtle: "#9CA3AF",
  border: "#E5E7EB",

  accent: "#2563EB",
  accentDark: "#1D4ED8",
  accentLight: "#DBEAFE",
  accentSoft: "#F0F5FF",

  success: "#16A34A",
  successLight: "#DCFCE7",
  warning: "#D97706",
  warningLight: "#FEF3C7",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  star: "#F59E0B",
}

export const R = { sm: 8, md: 12, lg: 16, pill: 999 }

export const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }

/** Sombra leve e consistente (iOS usa shadow*, Android usa elevation). */
export function sombra(nivel: 1 | 2 | 3 = 1): ViewStyle {
  const cfg = { 1: [2, 6, 0.04, 2], 2: [3, 10, 0.06, 3], 3: [6, 16, 0.1, 6] }[nivel]
  return Platform.select({
    android: { elevation: cfg[3] },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: cfg[0] },
      shadowRadius: cfg[1],
      shadowOpacity: cfg[2],
    },
  }) as ViewStyle
}

/** Durações e molas usadas nas animações (Reanimated). */
export const MOTION = {
  rapido: 160,
  normal: 240,
  mola: { damping: 18, stiffness: 220, mass: 0.8 },
  molaPress: { damping: 20, stiffness: 400, mass: 0.6 },
}
