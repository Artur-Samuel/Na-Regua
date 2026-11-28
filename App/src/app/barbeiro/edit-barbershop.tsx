import { router } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon } from "../../components/Icon"
import { Input } from "../../components/input"
import { PressableScale } from "../../components/PressableScale"
import { Aviso, Skeleton } from "../../components/ui"
import { fotoUrl, getBarbershopByUser, getUser, updateBarbershop } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { haptic } from "../../utils/haptics"
import { escolherImagem } from "../../utils/imagem"

type Barbearia = {
  barbeariaId: number
  nome: string
  descricao: string
  endereco: string
  cidade: string
  telefone: string
  foto: string | null
  nomeAlteradoEm: string | null
  enderecoAlteradoEm: string | null
}

function diasRestantes(dataISO: string | null, limite: number): number {
  if (!dataISO) return 0
  const ultima = new Date(dataISO).getTime()
  const diff   = Math.floor((Date.now() - ultima) / 86400000)
  return Math.max(0, limite - diff)
}

function Secao({ titulo, ordem, children }: { titulo: string; ordem: number; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(ordem * 60).duration(350)} style={s.section}>
      <Text style={s.sectionTitle}>{titulo}</Text>
      {children}
    </Animated.View>
  )
}

export default function EditBarbershop() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)
  const [barbearia, setBarbearia] = useState<Barbearia | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  // Campos do formulário
  const [nome, setNome] = useState("")
  const [descricao, setDescricao] = useState("")
  const [endereco, setEndereco] = useState("")
  const [cidade, setCidade] = useState("")
  const [telefone, setTelefone] = useState("")
  const [foto, setFoto] = useState<string | null>(null)         // URL da foto salva
  const [fotoNova, setFotoNova] = useState<string | null>(null) // data URI escolhido agora
  const [escolhendo, setEscolhendo] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }
    setUserId(user.id)

    try {
      const data = await getBarbershopByUser(user.id)
      if (data.status !== "success" || !data.barbearia) {
        Alert.alert("Erro", "Barbearia não encontrada.")
        router.back()
        return
      }

      const b = data.barbearia as Barbearia
      setBarbearia(b)
      setNome(b.nome)
      setDescricao(b.descricao ?? "")
      setEndereco(b.endereco)
      setCidade(b.cidade)
      setTelefone(b.telefone ?? "")
      setFoto(fotoUrl(b.foto))
      setLoading(false)
    } catch {
      Alert.alert("Sem conexão", "Não foi possível carregar a barbearia.")
      router.back()
    }
  }

  async function escolherFoto() {
    if (escolhendo) return
    setEscolhendo(true)
    try {
      const nova = await escolherImagem({ aspecto: [16, 9], larguraMax: 1280 })
      if (nova) {
        haptic.leve()
        setFotoNova(nova)
        setErro(null)
      }
    } catch {
      setErro("Não foi possível abrir essa imagem. Tente outra.")
    } finally {
      setEscolhendo(false)
    }
  }

  async function handleSalvar() {
    if (!nome.trim() || !endereco.trim() || !cidade.trim()) {
      haptic.erro()
      setErro("Preencha nome, endereço e cidade.")
      return
    }
    if (!userId || !barbearia) return

    setSaving(true)
    setErro(null)
    try {
      const data = await updateBarbershop({
        barbeariaId: barbearia.barbeariaId,
        userId,
        nome: nome.trim(),
        descricao: descricao.trim(),
        endereco: endereco.trim(),
        cidade: cidade.trim(),
        telefone: telefone.trim(),
        // Só manda a foto quando mudou; a salva continua no servidor
        ...(fotoNova ? { foto: fotoNova } : {}),
      })

      if (data.status === "success") {
        haptic.sucesso()
        if (data.aviso) {
          Alert.alert("Salvo", data.aviso, [{ text: "OK", onPress: () => router.back() }])
        } else {
          router.back()
        }
      } else {
        haptic.erro()
        setErro(data.message ?? "Não foi possível salvar. Tente novamente.")
      }
    } catch {
      setErro("Sem conexão com o servidor.")
    } finally {
      setSaving(false)
    }
  }

  const fotoExibida = fotoNova ?? foto
  const diasNome     = barbearia ? diasRestantes(barbearia.nomeAlteradoEm, 7) : 0
  const diasEndereco = barbearia ? diasRestantes(barbearia.enderecoAlteradoEm, 30) : 0

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Editar barbearia" />

      {loading ? (
        <View style={[s.scroll, { gap: 14 }]}>
          <Skeleton height={180} radius={R.lg} />
          <Skeleton height={160} radius={R.lg} />
          <Skeleton height={160} radius={R.lg} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Foto ── */}
          <Animated.View entering={FadeIn.duration(300)}>
            <PressableScale style={s.fotoWrapper} onPress={escolherFoto} accessibilityRole="button" accessibilityLabel="Alterar foto">
              {fotoExibida ? (
                <Image source={{ uri: fotoExibida }} style={s.foto} resizeMode="cover" />
              ) : (
                <View style={s.fotoPlaceholder}>
                  <Icon name="image-outline" size={36} color={C.accent} />
                  <Text style={s.fotoPlaceholderText}>Adicionar foto de capa</Text>
                </View>
              )}
              <View style={s.fotoBadge}>
                {escolhendo ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="camera" size={14} color="#FFF" />}
                <Text style={s.fotoBadgeText}>{fotoExibida ? "Alterar" : "Escolher"}</Text>
              </View>
              {fotoNova && (
                <View style={s.fotoNovaTag}>
                  <Text style={s.fotoBadgeText}>Nova · salve para aplicar</Text>
                </View>
              )}
            </PressableScale>
          </Animated.View>

          <Secao titulo="Informações básicas" ordem={1}>
            <Input
              label="Nome da barbearia" required icon="storefront-outline"
              value={nome} onChangeText={setNome}
              editable={diasNome === 0}
              style={diasNome > 0 ? { opacity: 0.5 } : undefined}
            />
            {diasNome > 0 && <Aviso tipo="alerta" icon="lock-closed-outline" texto={`O nome pode ser alterado de novo em ${diasNome} dia(s).`} />}
            <Input
              label="Descrição" placeholder="Conte um pouco sobre sua barbearia…"
              value={descricao} onChangeText={setDescricao} multiline
            />
          </Secao>

          <Secao titulo="Localização" ordem={2}>
            <Input
              label="Endereço" required icon="location-outline" placeholder="Rua, número e complemento"
              value={endereco} onChangeText={setEndereco}
              editable={diasEndereco === 0}
              style={diasEndereco > 0 ? { opacity: 0.5 } : undefined}
            />
            {diasEndereco > 0 && <Aviso tipo="alerta" icon="lock-closed-outline" texto={`O endereço pode ser alterado de novo em ${diasEndereco} dia(s).`} />}
            <Input label="Cidade" required icon="business-outline" value={cidade} onChangeText={setCidade} />
          </Secao>

          <Secao titulo="Contato" ordem={3}>
            <Input
              label="Telefone / WhatsApp" icon="call-outline" placeholder="(11) 99999-9999"
              value={telefone} onChangeText={setTelefone} keyboardType="phone-pad"
            />
          </Secao>

          {erro ? (
            <Animated.View entering={FadeIn.duration(180)} style={{ marginBottom: 12 }}>
              <Aviso tipo="erro" icon="alert-circle" texto={erro} />
            </Animated.View>
          ) : null}

          <Button label="Salvar alterações" icon="checkmark" onPress={handleSalvar} loading={saving} />
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  fotoWrapper: { width: "100%", height: 180, borderRadius: R.lg, overflow: "hidden", backgroundColor: C.border, marginBottom: 14 },
  foto: { width: "100%", height: "100%" },
  fotoPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.accentLight, gap: 8 },
  fotoPlaceholderText: { fontSize: 14, color: C.accentDark, fontWeight: "600" },
  fotoBadge: {
    position: "absolute", right: 12, bottom: 12, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(17,24,39,0.7)", paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill,
  },
  fotoBadgeText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  fotoNovaTag: {
    position: "absolute", left: 12, top: 12, backgroundColor: C.accent,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: R.pill,
  },

  section: {
    backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 14, gap: 14,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: C.accent, textTransform: "uppercase", letterSpacing: 0.8 },
})
