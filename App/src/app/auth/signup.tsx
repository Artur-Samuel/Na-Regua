import { router } from "expo-router"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon, IconName } from "../../components/Icon"
import { Input } from "../../components/input"
import { Logo } from "../../components/Logo"
import { PressableScale } from "../../components/PressableScale"
import { Aviso } from "../../components/ui"
import { signup } from "../../services/api"
import { C, R } from "../../theme"
import { haptic } from "../../utils/haptics"

type Tipo = "cliente" | "barbeiro"

const TIPOS: { key: Tipo; titulo: string; texto: string; icon: IconName }[] = [
  { key: "cliente", titulo: "Sou cliente", texto: "Quero agendar cortes", icon: "person-outline" },
  { key: "barbeiro", titulo: "Sou barbeiro", texto: "Quero receber clientes", icon: "cut-outline" },
]

type Erros = Partial<Record<"nome" | "email" | "senha", string>>

export default function Signup() {
  const insets = useSafeAreaInsets()
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [telefone, setTelefone] = useState("")
  const [tipo, setTipo] = useState<Tipo>("cliente")
  const [loading, setLoading] = useState(false)
  const [erros, setErros] = useState<Erros>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  function validar() {
    const e: Erros = {}
    if (!nome.trim()) e.nome = "Informe seu nome"
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "E-mail inválido"
    if (senha.length < 6) e.senha = "Use pelo menos 6 caracteres"
    setErros(e)
    return Object.keys(e).length === 0
  }

  async function handleSignup() {
    setErroGeral(null)
    if (!validar()) { haptic.erro(); return }

    setLoading(true)
    try {
      const data = await signup(nome.trim(), email.trim(), senha, telefone, tipo)
      if (data.status === "success") {
        haptic.sucesso()
        router.replace({ pathname: "/auth", params: { email: email.trim(), novo: "1" } })
      } else {
        haptic.erro()
        setErroGeral(data.message || "Não foi possível criar a conta.")
      }
    } catch {
      haptic.erro()
      setErroGeral("Falha na conexão com o servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="" />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(380)}>
          <Logo variante="marca" altura={34} style={{ marginBottom: 16 }} />
          <Text style={s.title}>Criar conta</Text>
          <Text style={s.subtitle}>Leva menos de um minuto</Text>

          {/* Tipo de conta */}
          <View style={s.tipoRow}>
            {TIPOS.map((t) => {
              const ativo = tipo === t.key
              return (
                <PressableScale
                  key={t.key}
                  style={[s.tipoCard, ativo && s.tipoCardAtivo]}
                  onPress={() => { haptic.leve(); setTipo(t.key) }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: ativo }}
                >
                  <View style={[s.tipoIcon, ativo && { backgroundColor: C.accent }]}>
                    <Icon name={t.icon} size={20} color={ativo ? "#FFF" : C.accent} />
                  </View>
                  <Text style={[s.tipoTitulo, ativo && { color: C.accentDark }]}>{t.titulo}</Text>
                  <Text style={s.tipoTexto}>{t.texto}</Text>
                  {ativo ? (
                    <Animated.View entering={FadeIn.duration(150)} style={s.tipoCheck}>
                      <Icon name="checkmark-circle" size={20} color={C.accent} />
                    </Animated.View>
                  ) : null}
                </PressableScale>
              )
            })}
          </View>

          <View style={s.form}>
            <Input
              label="Nome" required icon="person-outline" placeholder="Seu nome completo"
              value={nome} error={erros.nome} autoComplete="name"
              onChangeText={(v) => { setNome(v); setErros((e) => ({ ...e, nome: undefined })) }}
            />
            <Input
              label="E-mail" required icon="mail-outline" placeholder="seu@email.com"
              keyboardType="email-address" autoCapitalize="none" autoComplete="email"
              value={email} error={erros.email}
              onChangeText={(v) => { setEmail(v); setErros((e) => ({ ...e, email: undefined })) }}
            />
            <Input
              label="Senha" required icon="lock-closed-outline" placeholder="Mínimo 6 caracteres"
              secureTextEntry value={senha} error={erros.senha} autoComplete="new-password"
              onChangeText={(v) => { setSenha(v); setErros((e) => ({ ...e, senha: undefined })) }}
            />
            <Input
              label="Telefone" icon="call-outline" placeholder="(11) 99999-9999 (opcional)"
              keyboardType="phone-pad" value={telefone} onChangeText={setTelefone}
            />
          </View>

          {erroGeral ? (
            <Animated.View entering={FadeIn.duration(200)} style={{ marginBottom: 16 }}>
              <Aviso tipo="erro" icon="alert-circle" texto={erroGeral} />
            </Animated.View>
          ) : null}

          <Button label="Criar conta" onPress={handleSignup} loading={loading} />

          <View style={s.footer}>
            <Text style={s.footerText}>Já tem conta?</Text>
            <PressableScale onPress={() => router.replace("/auth")} hitSlop={8} scaleTo={0.95}>
              <Text style={s.footerLink}> Fazer login</Text>
            </PressableScale>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 24, paddingTop: 4 },
  title: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -0.6 },
  subtitle: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 20 },

  tipoRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  tipoCard: {
    flex: 1, padding: 14, borderRadius: R.lg, borderWidth: 1.5, borderColor: C.border,
    backgroundColor: C.card, gap: 4,
  },
  tipoCardAtivo: { borderColor: C.accent, backgroundColor: C.accentSoft },
  tipoIcon: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.accentLight,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  tipoTitulo: { fontSize: 15, fontWeight: "700", color: C.text },
  tipoTexto: { fontSize: 12, color: C.muted },
  tipoCheck: { position: "absolute", top: 10, right: 10 },

  form: { gap: 14, marginBottom: 20 },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 20 },
  footerText: { fontSize: 14, color: C.muted },
  footerLink: { fontSize: 14, color: C.accent, fontWeight: "700" },
})
