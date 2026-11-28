// src/components/ProtectedLayout.tsx
import { Redirect, Stack } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, View } from "react-native"
import { getUser, User } from "../services/api"
import { C } from "../theme"
import { Logo } from "./Logo"

type Props = {
  tipoPermitido: User["tipo"]
}

export const HOME_POR_TIPO: Record<User["tipo"], string> = {
  cliente: "/cliente/home",
  barbeiro: "/barbeiro/dashboard",
}

/** Tela de espera enquanto a sessão é lida do aparelho. */
export function TelaVerificando() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 28, backgroundColor: C.bg }}>
      <Logo variante="completa" altura={120} />
      <ActivityIndicator size="small" color={C.accent} />
    </View>
  )
}

export default function ProtectedLayout({ tipoPermitido }: Props) {
  const [verificando, setVerificando] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setVerificando(false))
  }, [])

  if (verificando) return <TelaVerificando />

  // Não logado → login
  if (!user) return <Redirect href="/auth" />

  // Logado, mas na área errada → manda para a área dele
  if (user.tipo !== tipoPermitido) return <Redirect href={HOME_POR_TIPO[user.tipo] as any} />

  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: C.bg } }}
    />
  )
}
