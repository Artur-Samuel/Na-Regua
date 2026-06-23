import { Link, router } from "expo-router"
import { useState } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

import { Button } from "../components/button"
import { Input } from "../components/input"
import { login, saveUser } from "../services/api"

export default function Login() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !senha) {
      return Alert.alert("Campos obrigatórios", "Preencha e-mail e senha para continuar.")
    }

    setLoading(true)
    const data = await login(email, senha)
    setLoading(false)

    if (data.status === "success") {
      // ✅ Salva o usuário no dispositivo para outras telas usarem
      await saveUser({
        id: data.user.id,
        nome: data.user.nome,
        email: data.user.email,
        tipo: data.user.tipo,
      })

      if (data.user.tipo === "cliente") {
        router.replace("/home")
      } else {
        router.replace("/dashboard")
      }
    } else {
      Alert.alert("Acesso negado", "E-mail ou senha incorretos. Tente novamente.")
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroContainer}>
          <Image
            source={require("../components/images/logo.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.greeting}>Bem-vindo de volta</Text>
            <Text style={styles.subtitle}>Faça login para continuar</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>E-mail</Text>
              <Input
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Senha</Text>
              <Input
                placeholder="••••••••"
                secureTextEntry
                onChangeText={setSenha}
              />
            </View>

            <TouchableOpacity style={styles.forgotWrapper} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Esqueceu a senha?</Text>
            </TouchableOpacity>
          </View>

          <Button
            label={loading ? "Entrando…" : "Entrar"}
            onPress={handleLogin}
            disabled={loading}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta?</Text>
            <Link href="/signup" asChild>
              <Pressable>
                <Text style={styles.footerLink}> Cadastre-se</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const ACCENT = "#2563EB"
const TEXT_PRIMARY = "#111827"
const TEXT_MUTED = "#6B7280"
const BORDER = "#E5E7EB"

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, alignItems: "center", paddingBottom: 40 },
  heroContainer: {
    width: "100%", alignItems: "center", justifyContent: "center",
    paddingTop: 64, paddingBottom: 32, backgroundColor: "#FFFFFF",
  },
  heroImage: { width: 230, height: 230 },
  card: { width: "100%", maxWidth: 420, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 16 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 26, fontWeight: "700", color: TEXT_PRIMARY, letterSpacing: -0.5, marginBottom: 4 },
  subtitle: { fontSize: 14, color: TEXT_MUTED, fontWeight: "400" },
  divider: { height: 1, backgroundColor: BORDER, marginBottom: 24 },
  form: { gap: 16, marginBottom: 24 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: TEXT_PRIMARY, letterSpacing: 0.2 },
  forgotWrapper: { alignSelf: "flex-end", marginTop: -4 },
  forgotText: { fontSize: 13, color: ACCENT, fontWeight: "500" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
  footerText: { fontSize: 14, color: TEXT_MUTED },
  footerLink: { fontSize: 14, color: ACCENT, fontWeight: "600" },
})