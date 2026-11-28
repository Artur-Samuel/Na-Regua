// src/components/Icon.tsx
// Ícones Ionicons com tipo do nome exportado para os outros componentes.
import Ionicons from "@expo/vector-icons/Ionicons"
import { ComponentProps } from "react"

export type IconName = ComponentProps<typeof Ionicons>["name"]

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color: string }) {
  return <Ionicons name={name} size={size} color={color} />
}
