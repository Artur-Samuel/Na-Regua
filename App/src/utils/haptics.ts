// src/utils/haptics.ts
// Vibrações curtas. Falham em silêncio (web / aparelho sem motor).
import * as Haptics from "expo-haptics"
import { Platform } from "react-native"

const ativo = Platform.OS !== "web"

export const haptic = {
  leve: () => { if (ativo) Haptics.selectionAsync().catch(() => {}) },
  toque: () => { if (ativo) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}) },
  sucesso: () => { if (ativo) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}) },
  erro: () => { if (ativo) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}) },
}
