// src/app/cliente/avaliar.tsx
// Avaliação de um atendimento concluído. Depois de publicada não pode ser alterada.
import { router, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import Estrelas from "../../components/Estrelas"
import { Header } from "../../components/Header"
import { Icon } from "../../components/Icon"
import { Input } from "../../components/input"
import { Aviso, Card } from "../../components/ui"
import { createAvaliacao } from "../../services/api"
import { C, sombra } from "../../theme"
import { formatarData } from "../../utils/format"
import { haptic } from "../../utils/haptics"

const LIMITE = 500
const ROTULOS = ["", "Péssimo", "Ruim", "Regular", "Bom", "Excelente"]

export default function Avaliar() {
  const insets = useSafeAreaInsets()
  const { agendamentoId, nomeBarbearia, nomeBarbeiro, data } = useLocalSearchParams<{
    agendamentoId: string
    nomeBarbearia?: string
    nomeBarbeiro?: string
    data?: string
  }>()

  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [publicada, setPublicada] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function confirmar() {
    Alert.alert(
      "Publicar avaliação?",
      "Depois de publicada, a avaliação não pode ser alterada nem excluída.",
      [
        { text: "Revisar", style: "cancel" },
        { text: "Publicar", onPress: enviar },
      ]
    )
  }

  async function enviar() {
    setEnviando(true)
    setErro(null)
    try {
      const res = await createAvaliacao({
        agendamentoId: Number(agendamentoId),
        nota,
        comentario: comentario.trim(),
      })
      if (res.status === "success") {
        haptic.sucesso()
        setPublicada(true)
      } else {
        haptic.erro()
        setErro(res.message ?? "Não foi possível publicar. Tente novamente.")
      }
    } catch {
      haptic.erro()
      setErro("Sem conexão com o servidor.")
    } finally {
      setEnviando(false)
    }
  }

  if (publicada) {
    return (
      <View style={[s.root, s.sucesso, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Animated.View entering={ZoomIn.springify().damping(11)} style={s.sucessoCirculo}>
          <Icon name="star" size={52} color="#FFF" />
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(200).duration(350)} style={s.sucessoTitulo}>Obrigado!</Animated.Text>
        <Animated.Text entering={FadeInUp.delay(270).duration(350)} style={s.sucessoTexto}>
          Sua avaliação ajuda outros clientes a escolher.
        </Animated.Text>
        <Animated.View entering={FadeInUp.delay(360).duration(350)} style={{ alignSelf: "stretch", marginTop: 28 }}>
          <Button label="Voltar" onPress={() => router.back()} />
        </Animated.View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Avaliar atendimento" />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card style={{ alignItems: "center", paddingVertical: 24 }}>
            <Text style={s.barbearia}>{nomeBarbearia ?? "Barbearia"}</Text>
            <Text style={s.detalhe}>
              {nomeBarbeiro ? `com ${nomeBarbeiro}` : ""}
              {nomeBarbeiro && data ? " · " : ""}
              {formatarData(data)}
            </Text>

            <Text style={s.pergunta}>Como foi sua experiência?</Text>
            <View style={s.estrelas}>
              <Estrelas nota={nota} tamanho={42} onChange={setNota} />
            </View>
            <Animated.Text key={nota} entering={FadeIn.duration(180)} style={[s.rotulo, !nota && { color: C.subtle }]}>
              {nota ? ROTULOS[nota] : "Toque nas estrelas"}
            </Animated.Text>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(350)}>
          <Card>
            <Input
              label="Comentário (opcional)"
              placeholder="Conte como foi o atendimento…"
              value={comentario}
              onChangeText={(t) => setComentario(t.slice(0, LIMITE))}
              multiline
            />
            <Text style={s.contador}>{comentario.length}/{LIMITE}</Text>
          </Card>
        </Animated.View>

        <Aviso tipo="alerta" icon="lock-closed-outline" texto="A avaliação não pode ser alterada depois de publicada." />

        {erro ? <Aviso tipo="erro" icon="alert-circle" texto={erro} /> : null}

        <Button label="Publicar avaliação" icon="send" onPress={confirmar} disabled={nota === 0} loading={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingTop: 8, gap: 14 },

  barbearia: { fontSize: 19, fontWeight: "800", color: C.text, textAlign: "center", letterSpacing: -0.3 },
  detalhe: { fontSize: 13, color: C.muted, textAlign: "center", marginTop: 4 },
  pergunta: { fontSize: 15, fontWeight: "600", color: C.text, textAlign: "center", marginTop: 22 },
  estrelas: { alignItems: "center", marginTop: 12 },
  rotulo: { fontSize: 14, fontWeight: "700", color: C.star, textAlign: "center", marginTop: 10, minHeight: 20 },

  contador: { fontSize: 11, color: C.muted, textAlign: "right", marginTop: 6 },

  sucesso: { alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  sucessoCirculo: {
    width: 108, height: 108, borderRadius: 54, backgroundColor: C.star,
    alignItems: "center", justifyContent: "center", marginBottom: 22, ...sombra(3),
  },
  sucessoTitulo: { fontSize: 26, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  sucessoTexto: { fontSize: 15, color: C.muted, textAlign: "center", marginTop: 6, lineHeight: 22 },
})
