// src/app/index.tsx
// Rota inicial: o layout de /auth decide se mostra o login ou manda para a área do usuário.
import { Redirect } from "expo-router"

export default function Index() {
  return <Redirect href="/auth" />
}
