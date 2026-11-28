import { router } from "expo-router"
import { useEffect, useState } from "react"
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import Animated, { FadeIn, LinearTransition, SlideInDown } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { Header } from "../../components/Header"
import { Icon } from "../../components/Icon"
import { Input } from "../../components/input"
import { PressableScale } from "../../components/PressableScale"
import { Aviso, Badge, EmptyState, entradaLista, SkeletonCard } from "../../components/ui"
import { createServico, getBarbeiroByUserId, getServicos, getUser, updateServico } from "../../services/api"
import { C, R, sombra } from "../../theme"
import { formatarMoeda } from "../../utils/format"
import { haptic } from "../../utils/haptics"

type Servico = {
  servicoId: number
  nome: string
  preco: number
  duracaoMin: number
  ativo: boolean
}

type Form = {
  servicoId: number | null
  nome: string
  preco: string
  duracaoMin: string
}

const FORM_VAZIO: Form = { servicoId: null, nome: "", preco: "", duracaoMin: "" }
const DURACOES = [15, 30, 45, 60, 90]

export default function Servicos() {
  const insets = useSafeAreaInsets()
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null)
  const [servicos, setServicos] = useState<Servico[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [saving, setSaving] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const user = await getUser()
    if (!user) { router.replace("/auth"); return }

    try {
      // Funciona para dono e funcionário: busca o barbeiroId do próprio usuário
      const data = await getBarbeiroByUserId(user.id)
      if (data.status !== "success") return
      setBarbeiroId(data.barbeiro.barbeiroId)
      await carregarServicos(data.barbeiro.barbeiroId)
    } catch {
      // sem conexão: lista vazia
    } finally {
      setLoading(false)
    }
  }

  async function carregarServicos(id: number) {
    const data = await getServicos(id)
    if (data.status === "success") setServicos(data.servicos)
  }

  function abrirCriar() {
    setForm(FORM_VAZIO)
    setErroForm(null)
    setModalVisible(true)
  }

  function abrirEditar(sv: Servico) {
    setForm({
      servicoId: sv.servicoId,
      nome: sv.nome,
      preco: String(sv.preco).replace(".", ","),
      duracaoMin: String(sv.duracaoMin),
    })
    setErroForm(null)
    setModalVisible(true)
  }

  async function salvar() {
    const preco = parseFloat(form.preco.replace(",", "."))
    const duracao = parseInt(form.duracaoMin)
    if (!form.nome.trim() || isNaN(preco) || isNaN(duracao)) {
      haptic.erro()
      setErroForm("Preencha nome, preço e duração.")
      return
    }
    if (duracao <= 0 || preco < 0) {
      haptic.erro()
      setErroForm("Preço e duração precisam ser valores válidos.")
      return
    }
    if (!barbeiroId) return

    setSaving(true)
    setErroForm(null)
    const body = { barbeiroId, nome: form.nome.trim(), preco, duracaoMin: duracao }

    try {
      const data = form.servicoId !== null
        ? await updateServico({ ...body, servicoId: form.servicoId, ativo: true })
        : await createServico(body)

      if (data.status === "success") {
        haptic.sucesso()
        setModalVisible(false)
        await carregarServicos(barbeiroId)
      } else {
        setErroForm(data.message ?? "Tente novamente.")
      }
    } catch {
      setErroForm("Sem conexão com o servidor.")
    } finally {
      setSaving(false)
    }
  }

  function desativar(servico: Servico) {
    Alert.alert(
      "Desativar serviço",
      `Deseja desativar "${servico.nome}"? Ele não aparecerá mais para os clientes.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desativar",
          style: "destructive",
          onPress: async () => {
            if (!barbeiroId) return
            try {
              await updateServico({
                servicoId: servico.servicoId,
                barbeiroId,
                nome: servico.nome,
                preco: servico.preco,
                duracaoMin: servico.duracaoMin,
                ativo: false,
              })
              await carregarServicos(barbeiroId)
            } catch {
              Alert.alert("Sem conexão", "Não foi possível falar com o servidor.")
            }
          },
        },
      ]
    )
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Header
        title="Meus serviços"
        right={
          <PressableScale style={s.addBtn} onPress={abrirCriar} scaleTo={0.9} accessibilityLabel="Novo serviço">
            <Icon name="add" size={22} color="#FFF" />
          </PressableScale>
        }
      />

      {loading ? (
        <View style={s.list}>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</View>
      ) : (
        <Animated.FlatList
          data={servicos}
          keyExtractor={(item) => String(item.servicoId)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          itemLayoutAnimation={LinearTransition.springify().damping(18)}
          ListEmptyComponent={
            <EmptyState
              icon="cut-outline"
              title="Nenhum serviço cadastrado"
              text="Adicione seus serviços para que os clientes possam agendá-los."
              action={<Button label="Adicionar serviço" icon="add" onPress={abrirCriar} />}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={entradaLista(index)}>
              <PressableScale
                style={[s.card, !item.ativo && { opacity: 0.55 }]}
                onPress={() => abrirEditar(item)}
                accessibilityRole="button"
                accessibilityHint="Editar serviço"
              >
                <View style={s.cardIcon}><Icon name="cut" size={18} color={C.accent} /></View>
                <View style={s.cardInfo}>
                  <Text style={s.cardNome}>{item.nome}</Text>
                  <View style={s.cardMeta}>
                    <Icon name="time-outline" size={13} color={C.muted} />
                    <Text style={s.cardDuracao}>{item.duracaoMin} min</Text>
                    {!item.ativo && <Badge label="Inativo" cor={C.warning} fundo={C.warningLight} />}
                  </View>
                </View>
                <Text style={s.cardPreco}>{formatarMoeda(item.preco)}</Text>
                {item.ativo && (
                  <PressableScale
                    style={s.iconBtn}
                    onPress={() => desativar(item)}
                    scaleTo={0.85}
                    hitSlop={6}
                    accessibilityLabel={`Desativar ${item.nome}`}
                  >
                    <Icon name="trash-outline" size={18} color={C.error} />
                  </PressableScale>
                )}
              </PressableScale>
            </Animated.View>
          )}
        />
      )}

      {/* Modal em fade; o painel sobe com mola por cima do fundo escurecido */}
      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} accessibilityLabel="Fechar" />
          <Animated.View
            entering={SlideInDown.springify().damping(20).stiffness(200)}
            style={[s.modalSheet, { paddingBottom: 24 + insets.bottom }]}
          >
            <View style={s.alca} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{form.servicoId ? "Editar serviço" : "Novo serviço"}</Text>
              <PressableScale onPress={() => setModalVisible(false)} scaleTo={0.85} hitSlop={10} accessibilityLabel="Fechar">
                <Icon name="close" size={22} color={C.muted} />
              </PressableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
              <Input
                label="Nome do serviço" required placeholder="Ex: Corte degradê"
                value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))}
              />

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Preço (R$)" required placeholder="35,00" keyboardType="decimal-pad"
                    value={form.preco} onChangeText={(v) => setForm((f) => ({ ...f, preco: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Duração (min)" required placeholder="30" keyboardType="number-pad"
                    value={form.duracaoMin} onChangeText={(v) => setForm((f) => ({ ...f, duracaoMin: v.replace(/\D/g, "") }))}
                  />
                </View>
              </View>

              {/* Durações comuns com um toque */}
              <View style={s.chips}>
                {DURACOES.map((d) => {
                  const sel = form.duracaoMin === String(d)
                  return (
                    <PressableScale
                      key={d}
                      style={[s.chip, sel && s.chipSel]}
                      onPress={() => { haptic.leve(); setForm((f) => ({ ...f, duracaoMin: String(d) })) }}
                      scaleTo={0.9}
                    >
                      <Text style={[s.chipText, sel && { color: "#FFF" }]}>{d} min</Text>
                    </PressableScale>
                  )
                })}
              </View>

              {erroForm ? (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Aviso tipo="erro" icon="alert-circle" texto={erroForm} />
                </Animated.View>
              ) : null}

              <Button label="Salvar serviço" icon="checkmark" onPress={salvar} loading={saving} style={{ marginTop: 4 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  list: { padding: 20, paddingTop: 8 },

  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: C.card, borderRadius: R.lg, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border, ...sombra(1),
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, gap: 4 },
  cardNome: { fontSize: 15, fontWeight: "700", color: C.text },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardDuracao: { fontSize: 12, color: C.muted, marginRight: 6 },
  cardPreco: { fontSize: 15, fontWeight: "800", color: C.text },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.errorLight, alignItems: "center", justifyContent: "center" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(17,24,39,0.45)" },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, maxHeight: "85%",
  },
  alca: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 14 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  modalTitle: { fontSize: 19, fontWeight: "800", color: C.text, letterSpacing: -0.3 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.pill, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg },
  chipSel: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 13, fontWeight: "600", color: C.text },
})
