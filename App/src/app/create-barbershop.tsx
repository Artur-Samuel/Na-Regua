import { router } from "expo-router"
import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../components/button"
import { Header } from "../components/Header"
import { Icon } from "../components/Icon"
import { Input } from "../components/input"
import { Aviso } from "../components/ui"
import { createBarbershop, getUser } from "../services/api"
import { C, R, sombra } from "../theme"
import { haptic } from "../utils/haptics"

type Errors = Record<string, string>

function Secao({ titulo, ordem, children }: { titulo: string; ordem: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(ordem * 60).duration(350)} style={s.section}>
      <Text style={s.sectionTitle}>{titulo}</Text>
      {children}
    </Animated.View>
  )
}

export default function CreateBarbershop() {
  const insets = useSafeAreaInsets()

  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [endereco, setEndereco] = useState("")
  const [cidade, setCidade] = useState("")
  const [telefone, setTelefone] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  function validate(): boolean {
    const e: Errors = {}
    if (!nome.trim()) e.nome = "Nome é obrigatório"
    if (!endereco.trim()) e.endereco = "Endereço é obrigatório"
    if (!cidade.trim()) e.cidade = "Cidade é obrigatória"
    if (telefone && !/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(telefone.replace(/\s/g, ""))) {
      e.telefone = "Telefone inválido"
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const limpar = (campo: string) => setErrors((e) => ({ ...e, [campo]: "" }))

  async function handleCreate() {
    // Pega o usuário real logado (em vez de userId fixo)
    const user = await getUser()
    if (!user) {
      Alert.alert("Sessão expirada", "Faça login novamente para continuar.")
      router.replace("/auth")
      return
    }

    setErroGeral(null)
    if (!validate()) { haptic.erro(); return }

    setLoading(true)
    try {
      const data = await createBarbershop({
        userId: user.id,
        nome,
        descricao,
        endereco,
        cidade,
        telefone,
        // latitude/longitude são calculadas no servidor a partir do endereço
      })

      if (data.status === "success") {
        haptic.sucesso()
        Alert.alert(
          "Barbearia criada! 🎉",
          data.noMapa ? "Sua barbearia já aparece no mapa." : data.aviso,
          [{ text: "Ver painel", onPress: () => router.replace("/barbeiro/dashboard") }]
        )
      } else {
        haptic.erro()
        setErroGeral(data.message ?? "Tente novamente em instantes.")
      }
    } catch {
      setErroGeral("Sem conexão com o servidor.")
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(350)} style={s.header}>
          <View style={s.headerIcon}>
            <Icon name="storefront" size={30} color={C.accent} />
          </View>
          <Text style={s.title}>Criar barbearia</Text>
          <Text style={s.subtitle}>Preencha os dados para cadastrar seu negócio e aparecer no mapa.</Text>
        </Animated.View>

        <Secao titulo="Informações básicas" ordem={1}>
          <Input
            label="Nome da barbearia" required icon="storefront-outline" placeholder="Ex: Barbearia do João"
            value={nome} error={errors.nome} onChangeText={(v) => { setNome(v); limpar("nome") }}
          />
          <Input
            label="Descrição" placeholder="Conte um pouco sobre sua barbearia…"
            value={descricao} onChangeText={setDescricao} multiline
          />
        </Secao>

        <Secao titulo="Localização" ordem={2}>
          <Input
            label="Endereço" required icon="location-outline" placeholder="Rua, número e complemento"
            value={endereco} error={errors.endereco} onChangeText={(v) => { setEndereco(v); limpar("endereco") }}
          />
          <Input
            label="Cidade" required icon="business-outline" placeholder="São Paulo"
            value={cidade} error={errors.cidade} onChangeText={(v) => { setCidade(v); limpar("cidade") }}
          />
          <Aviso icon="navigate-outline" texto="A posição no mapa é calculada automaticamente a partir do endereço." />
        </Secao>

        <Secao titulo="Contato" ordem={3}>
          <Input
            label="Telefone / WhatsApp" icon="call-outline" placeholder="(11) 99999-9999" keyboardType="phone-pad"
            value={telefone} error={errors.telefone} onChangeText={(v) => { setTelefone(v); limpar("telefone") }}
          />
        </Secao>

        {erroGeral ? (
          <Animated.View entering={FadeIn.duration(180)} style={{ marginBottom: 12 }}>
            <Aviso tipo="erro" icon="alert-circle" texto={erroGeral} />
          </Animated.View>
        ) : null}

        <Button label="Criar barbearia" icon="checkmark" onPress={handleCreate} loading={loading} />
        <Text style={s.hint}>Campos marcados com * são obrigatórios</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20 },

  header: { alignItems: "center", marginBottom: 22, gap: 6 },
  headerIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentLight,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  title: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 21 },

  section: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 14, gap: 14,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: C.accent, textTransform: "uppercase", letterSpacing: 0.8 },

  hint: { fontSize: 12, color: C.muted, textAlign: "center", marginTop: 12 },
})
