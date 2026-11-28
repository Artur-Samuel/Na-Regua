import { Link, router, useLocalSearchParams } from "expo-router"
import { useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Input } from "../../components/input"
import { Logo } from "../../components/Logo"
import { Aviso } from "../../components/ui"
import { login, saveUser } from "../../services/api"
import { C } from "../../theme"
import { haptic } from "../../utils/haptics"

export default function Login() {
  const insets = useSafeAreaInsets()
  // Vindo do cadastro, o e-mail já chega preenchido
  const params = useLocalSearchParams<{ email?: string; novo?: string }>()
  const senhaRef = useRef<TextInput>(null)

  const [email, setEmail] = useState(params.email ?? "")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim() || !senha) {
      haptic.erro()
      return setErro("Preencha e-mail e senha para continuar.")
    }

    setErro(null)
    setLoading(true)
    try {
      const data = await login(email.trim(), senha)

      if (data.status === "success") {
        // Salva o usuário no dispositivo para outras telas usarem
        await saveUser({
          id: data.user.id,
          nome: data.user.nome,
          email: data.user.email,
          tipo: data.user.tipo,
          foto: data.user.foto ?? null,
        })
        haptic.sucesso()
        router.replace(data.user.tipo === "cliente" ? "/cliente/home" : "/barbeiro/dashboard")
      } else {
        haptic.erro()
        setErro("E-mail ou senha incorretos. Tente novamente.")
      }
    } catch {
      haptic.erro()
      setErro("Sem conexão com o servidor. Verifique sua internet.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={ZoomIn.duration(450).springify().damping(16)} style={styles.heroContainer}>
          <Logo variante="completa" altura={170} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.card}>
          <Text style={styles.greeting}>Bem-vindo de volta</Text>
          <Text style={styles.subtitle}>Faça login para agendar ou gerenciar sua barbearia</Text>

          {params.novo ? (
            <View style={{ marginTop: 16 }}>
              <Aviso icon="checkmark-circle" texto="Conta criada! Agora é só entrar." />
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              label="E-mail"
              icon="mail-outline"
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={(t) => { setEmail(t); setErro(null) }}
              returnKeyType="next"
              onSubmitEditing={() => senhaRef.current?.focus()}
            />
            <Input
              ref={senhaRef}
              label="Senha"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              value={senha}
              onChangeText={(t) => { setSenha(t); setErro(null) }}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
            />
          </View>

          {erro ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 16 }}>
              <Aviso tipo="erro" icon="alert-circle" texto={erro} />
            </Animated.View>
          ) : null}

          <Button label="Entrar" icon="log-in-outline" onPress={handleLogin} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta?</Text>
            <Link href="/auth/signup" asChild>
              <Pressable hitSlop={8}>
                <Text style={styles.footerLink}> Cadastre-se</Text>
              </Pressable>
            </Link>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  heroContainer: { alignItems: "center", marginBottom: 28 },
  card: { width: "100%", maxWidth: 420 },
  greeting: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, lineHeight: 20 },
  form: { gap: 16, marginTop: 24, marginBottom: 20 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 24 },
  footerText: { fontSize: 14, color: C.muted },
  footerLink: { fontSize: 14, color: C.accent, fontWeight: "700" },
})
