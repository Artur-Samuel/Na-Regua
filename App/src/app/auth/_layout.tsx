// src/app/auth/_layout.tsx
// Se o usuário já está logado, pula o login e vai direto para a área dele.
import { Redirect, Stack } from "expo-router"
import { useEffect, useState } from "react"
import { HOME_POR_TIPO, TelaVerificando } from "../../components/ProtectedLayout"
import { getUser, User } from "../../services/api"

export default function AuthLayout() {
  const [verificando, setVerificando] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    getUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setVerificando(false))
  }, [])

  if (verificando) return <TelaVerificando />

  if (user) return <Redirect href={HOME_POR_TIPO[user.tipo] as any} />

  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
}
