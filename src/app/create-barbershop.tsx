import { router } from "expo-router"
import { useState } from "react"
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../components/button"
import { Input } from "../components/input"
import { createBarbershop } from "../services/api"

/* ─── paleta ─────────────────────────────────────────── */
const C = {
  bg: "#F8F7F4",
  card: "#FFFFFF",
  accent: "#2563EB",
  accentLight: "#DBEAFE",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  error: "#DC2626",
  errorLight: "#FEE2E2",
}

type Errors = Record<string, string>

function FieldGroup({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <View style={f.group}>
      <View style={f.labelRow}>
        <Text style={f.label}>{label}</Text>
        {required && <Text style={f.required}>*</Text>}
      </View>
      {children}
      {error ? <Text style={f.errorText}>{error}</Text> : null}
    </View>
  )
}

const f = StyleSheet.create({
  group: { gap: 6, marginBottom: 4 },
  labelRow: { flexDirection: "row", gap: 3, alignItems: "center" },
  label: { fontSize: 13, fontWeight: "600", color: "#111827", letterSpacing: 0.2 },
  required: { fontSize: 13, color: C.error, fontWeight: "700" },
  errorText: { fontSize: 12, color: C.error, marginTop: 2 },
})

/* ─── tela ───────────────────────────────────────────── */
export default function CreateBarbershop() {
  const insets = useSafeAreaInsets()

  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [endereco, setEndereco] = useState("")
  const [cidade, setCidade] = useState("")
  const [telefone, setTelefone] = useState("")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  // ⚠️ substituir pelo userId do contexto de autenticação
  const userId = 4

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

  async function handleCreate() {
    if (!validate()) return

    setLoading(true)

    /**
     * ATENÇÃO — alinhamento com o banco:
     * A tabela `barbearias` tem FK para `barbeiroId`, não `userId`.
     * Seu endpoint `create_barbershop.php` deve:
     *   1. Receber o userId
     *   2. Buscar o barbeiroId: SELECT barbeiroId FROM barbeiros WHERE userId = :userId
     *   3. Inserir em barbearias usando esse barbeiroId
     *
     * Se o usuário ainda não tiver linha em `barbeiros`, o endpoint deve criá-la antes.
     */
    const data = await createBarbershop({
      userId,
      nome,
      descricao,
      endereco,
      cidade,
      telefone,
      latitude: -23.5505,   // TODO: usar expo-location para pegar coordenadas reais
      longitude: -46.6333,
    })

    setLoading(false)

    if (data.status === "success") {
      Alert.alert("Barbearia criada! 🎉", "Seu perfil já está visível no mapa.", [
        { text: "Ver dashboard", onPress: () => router.replace("/dashboard") },
      ])
    } else {
      Alert.alert("Erro ao criar", data.message ?? "Tente novamente em instantes.")
    }
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Voltar ── */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={s.backText}>‹ Voltar</Text>
        </TouchableOpacity>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.emoji}>💈</Text>
          <Text style={s.title}>Criar barbearia</Text>
          <Text style={s.subtitle}>
            Preencha os dados abaixo para cadastrar seu negócio e aparecer no mapa.
          </Text>
        </View>

        {/* ── Seção: Informações básicas ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Informações básicas</Text>

          <FieldGroup label="Nome da barbearia" required error={errors.nome}>
            <Input
              placeholder="Ex: Barbearia do João"
              onChangeText={(v) => { setNome(v); setErrors((e) => ({ ...e, nome: "" })) }}
            />
          </FieldGroup>

          <FieldGroup label="Descrição">
            <Input
              placeholder="Conte um pouco sobre sua barbearia…"
              onChangeText={setDescricao}
              multiline
              numberOfLines={3}
            />
          </FieldGroup>
        </View>

        {/* ── Seção: Localização ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Localização</Text>

          <FieldGroup label="Endereço" required error={errors.endereco}>
            <Input
              placeholder="Rua, número e complemento"
              onChangeText={(v) => { setEndereco(v); setErrors((e) => ({ ...e, endereco: "" })) }}
            />
          </FieldGroup>

          <FieldGroup label="Cidade" required error={errors.cidade}>
            <Input
              placeholder="São Paulo"
              onChangeText={(v) => { setCidade(v); setErrors((e) => ({ ...e, cidade: "" })) }}
            />
          </FieldGroup>

          {/* Aviso coordenadas automáticas */}
          <View style={s.infoBanner}>
            <Text style={s.infoBannerText}>
              📍 As coordenadas serão detectadas automaticamente pelo endereço em breve.
            </Text>
          </View>
        </View>

        {/* ── Seção: Contato ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Contato</Text>

          <FieldGroup label="Telefone / WhatsApp" error={errors.telefone}>
            <Input
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
              onChangeText={(v) => { setTelefone(v); setErrors((e) => ({ ...e, telefone: "" })) }}
            />
          </FieldGroup>
        </View>

        {/* ── Botão ── */}
        <Button label={loading ? "Criando…" : "Criar barbearia"} onPress={handleCreate} disabled={loading} />

        <Text style={s.hint}>Campos marcados com * são obrigatórios</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}

/* ─── styles ──────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 22 },

  backBtn: { paddingVertical: 12 },
  backText: { fontSize: 15, color: C.accent, fontWeight: "600" },

  header: { alignItems: "center", marginBottom: 28, paddingTop: 8, gap: 6 },
  emoji: { fontSize: 44 },
  title: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: "center", lineHeight: 22 },

  section: {
    backgroundColor: C.card, borderRadius: 16, padding: 18,
    marginBottom: 14, gap: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: C.accent,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4,
  },

  infoBanner: {
    backgroundColor: C.accentLight, borderRadius: 10, padding: 12,
  },
  infoBannerText: { fontSize: 12, color: C.accent, lineHeight: 18 },

  hint: { fontSize: 12, color: C.muted, textAlign: "center", marginTop: 12 },
})