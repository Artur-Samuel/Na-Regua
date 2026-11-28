// src/app/_layout.tsx
// Layout raiz: navegação em pilha sem cabeçalho nativo e barra de status escura.
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { C } from "../theme"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: C.bg },
        }}
      />
    </SafeAreaProvider>
  )
}
