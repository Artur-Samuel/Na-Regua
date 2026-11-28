// src/app/cliente/perfil.tsx
// Perfil do cliente: foto, números de uso, próximo horário, barbearias frequentadas,
// edição de dados, troca de senha, atalhos e saída.
import Constants from "expo-constants"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useState } from "react"
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "../../components/button"
import { formatarMedia } from "../../components/Estrelas"
import { Header } from "../../components/Header"
import { Icon, IconName } from "../../components/Icon"
import { Input } from "../../components/input"
import { Logo } from "../../components/Logo"
import { PressableScale } from "../../components/PressableScale"
import { Avatar, Aviso, Skeleton } from "../../components/ui"
import {
  alterarSenha,
  fotoUrl,
  getPerfil,
  getUser,
  Perfil as PerfilApi,
  removeUser,
  saveUser,
  updatePerfil,
} from "../../services/api"
import { C, MOTION, R, sombra } from "../../theme"
import { formatarData, formatarMoeda, nomeMes } from "../../utils/format"
import { haptic } from "../../utils/haptics"
import { escolherImagem } from "../../utils/imagem"

const entrada = (i: number) => FadeInDown.delay(i * 60).duration(350)

function Numero({ valor, label, icon }: { valor: string; label: string; icon: IconName }) {
  return (
    <View style={s.numero}>
      <Icon name={icon} size={16} color={C.accent} />
      <Text style={s.numeroValor}>{valor}</Text>
      <Text style={s.numeroLabel}>{label}</Text>
    </View>
  )
}

function Opcao({ icon, label, onPress, direita }: {
  icon: IconName; label: string; onPress: () => void; direita?: React.ReactNode
}) {
  return (
    <PressableScale style={s.opcao} onPress={onPress} accessibilityRole="button">
      <View style={s.opcaoIcon}><Icon name={icon} size={18} color={C.accent} /></View>
      <Text style={s.opcaoText}>{label}</Text>
      {direita ?? <Icon name="chevron-forward" size={18} color={C.subtle} />}
    </PressableScale>
  )
}

export default function Perfil() {
  const insets = useSafeAreaInsets()
  const [dados, setDados] = useState<PerfilApi | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [enviandoFoto, setEnviandoFoto] = useState(false)

  // Dados pessoais
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [msgDados, setMsgDados] = useState<{ tipo: "info" | "erro"; texto: string } | null>(null)

  // Senha
  const [senhaAberta, setSenhaAberta] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [msgSenha, setMsgSenha] = useState<{ tipo: "info" | "erro"; texto: string } | null>(null)

  async function carregar() {
    try {
      const d = await getPerfil()
      if (d.status !== "success") { setErro(d.message ?? "Não foi possível carregar o perfil."); return }
      setDados(d)
      setNome(d.perfil.nome)
      setTelefone(d.perfil.telefone ?? "")
      setErro(null)
    } catch {
      setErro("Sem conexão com o servidor. Puxe para tentar de novo.")
    }
  }

  // Recarrega ao voltar (ex.: depois de avaliar ou agendar)
  useFocusEffect(useCallback(() => { carregar() }, []))

  async function onRefresh() {
    setRefreshing(true)
    await carregar()
    setRefreshing(false)
  }

  /** Mantém o usuário salvo no aparelho igual ao servidor (home usa nome e foto). */
  async function sincronizarLocal(mudancas: { nome?: string; foto?: string | null }) {
    const local = await getUser()
    if (local) await saveUser({ ...local, ...mudancas })
  }

  /* ── Foto ── */
  async function enviarFoto(payload: { foto?: string; removerFoto?: boolean }) {
    if (!dados) return
    setEnviandoFoto(true)
    try {
      // Usa nome/telefone já salvos: a foto não leva junto edições não salvas
      const r = await updatePerfil({ nome: dados.perfil.nome, telefone: dados.perfil.telefone ?? "", ...payload })
      if (r.status === "success") {
        haptic.sucesso()
        setDados({ ...dados, perfil: { ...dados.perfil, foto: r.foto } })
        await sincronizarLocal({ foto: r.foto })
      } else {
        haptic.erro()
        Alert.alert("Foto não salva", r.message ?? "Tente novamente.")
      }
    } catch {
      Alert.alert("Sem conexão", "Não foi possível enviar a foto.")
    } finally {
      setEnviandoFoto(false)
    }
  }

  async function trocarFoto() {
    try {
      const nova = await escolherImagem({ aspecto: [1, 1], larguraMax: 600 })
      if (nova) await enviarFoto({ foto: nova })
    } catch {
      Alert.alert("Imagem inválida", "Não foi possível abrir essa imagem. Tente outra.")
    }
  }

  function opcoesFoto() {
    if (enviandoFoto) return
    if (!dados?.perfil.foto) { trocarFoto(); return }

    const remover = () => enviarFoto({ removerFoto: true })
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Escolher outra foto", "Remover foto", "Cancelar"], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (i) => { if (i === 0) trocarFoto(); if (i === 1) remover() }
      )
    } else {
      Alert.alert("Foto de perfil", undefined, [
        { text: "Remover", style: "destructive", onPress: remover },
        { text: "Cancelar", style: "cancel" },
        { text: "Escolher outra", onPress: trocarFoto },
      ])
    }
  }

  /* ── Dados pessoais ── */
  const alterouDados = !!dados && (nome.trim() !== dados.perfil.nome || telefone.trim() !== (dados.perfil.telefone ?? ""))

  async function salvarDados() {
    if (!dados) return
    if (nome.trim().length < 2) { haptic.erro(); setMsgDados({ tipo: "erro", texto: "Informe seu nome." }); return }

    setSalvando(true)
    setMsgDados(null)
    try {
      const r = await updatePerfil({ nome: nome.trim(), telefone: telefone.trim() })
      if (r.status === "success") {
        haptic.sucesso()
        setDados({ ...dados, perfil: { ...dados.perfil, nome: r.nome, telefone: r.telefone } })
        setNome(r.nome)
        setTelefone(r.telefone)
        await sincronizarLocal({ nome: r.nome })
        setMsgDados({ tipo: "info", texto: "Dados atualizados." })
      } else {
        haptic.erro()
        setMsgDados({ tipo: "erro", texto: r.message ?? "Não foi possível salvar." })
      }
    } catch {
      setMsgDados({ tipo: "erro", texto: "Sem conexão com o servidor." })
    } finally {
      setSalvando(false)
    }
  }

  /* ── Senha ── */
  function fecharSenha() {
    setSenhaAberta(false)
    setSenhaAtual(""); setNovaSenha(""); setConfirmar("")
  }

  async function salvarSenha() {
    if (novaSenha.length < 6) { haptic.erro(); setMsgSenha({ tipo: "erro", texto: "A nova senha precisa ter pelo menos 6 caracteres." }); return }
    if (novaSenha !== confirmar) { haptic.erro(); setMsgSenha({ tipo: "erro", texto: "A confirmação não bate com a nova senha." }); return }

    setTrocandoSenha(true)
    setMsgSenha(null)
    try {
      const r = await alterarSenha(senhaAtual, novaSenha)
      if (r.status === "success") {
        haptic.sucesso()
        fecharSenha()
        setMsgSenha({ tipo: "info", texto: "Senha alterada." })
      } else {
        haptic.erro()
        setMsgSenha({ tipo: "erro", texto: r.message ?? "Não foi possível alterar a senha." })
      }
    } catch {
      setMsgSenha({ tipo: "erro", texto: "Sem conexão com o servidor." })
    } finally {
      setTrocandoSenha(false)
    }
  }

  async function sair() {
    setSaindo(true)
    await removeUser()
    router.replace("/auth")
  }

  function agendarEm(b: PerfilApi["favoritas"][number]) {
    router.push({ pathname: "/cliente/agendar", params: { barbeariaId: String(b.barbeariaId), nomeBarbearia: b.nome } })
  }

  const p = dados?.perfil
  const membroDesde = p?.criadoEm ? nomeMes(p.criadoEm.slice(0, 7)).toLowerCase() : ""

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Meu perfil" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} tintColor={C.accent} />}
      >
        {/* ── Topo: foto, nome, e-mail ── */}
        <Animated.View entering={entrada(0)} style={s.topo}>
          <PressableScale
            onPress={opcoesFoto}
            scaleTo={0.94}
            disabled={!dados}
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de perfil"
          >
            <Avatar nome={p?.nome ?? "?"} size={92} foto={fotoUrl(p?.foto)} />
            {enviandoFoto && (
              <View style={s.fotoCarregando}><ActivityIndicator color="#FFF" /></View>
            )}
            <View style={s.fotoBadge}><Icon name="camera" size={14} color="#FFF" /></View>
          </PressableScale>
          {p ? (
            <>
              <Text style={s.nome}>{p.nome}</Text>
              <Text style={s.email}>{p.email}</Text>
              {membroDesde ? <Text style={s.desde}>No NaRégua desde {membroDesde}</Text> : null}
            </>
          ) : (
            <View style={{ alignItems: "center", gap: 8, marginTop: 12 }}>
              <Skeleton width={160} height={20} />
              <Skeleton width={200} height={14} />
            </View>
          )}
        </Animated.View>

        {erro && !dados ? (
          <Aviso tipo="erro" icon="cloud-offline-outline" texto={erro} onPress={onRefresh} />
        ) : null}

        {/* ── Números ── */}
        {dados && (
          <Animated.View entering={entrada(1)} style={s.numeros}>
            <Numero icon="cut-outline" valor={String(dados.resumo.cortes)} label={dados.resumo.cortes === 1 ? "corte" : "cortes"} />
            <View style={s.numeroSep} />
            <Numero icon="storefront-outline" valor={String(dados.resumo.barbearias)} label={dados.resumo.barbearias === 1 ? "barbearia" : "barbearias"} />
            <View style={s.numeroSep} />
            <Numero icon="star-outline" valor={String(dados.resumo.avaliacoes)} label={dados.resumo.avaliacoes === 1 ? "avaliação" : "avaliações"} />
          </Animated.View>
        )}
        {dados && dados.resumo.totalGasto > 0 && (
          <Animated.Text entering={entrada(1)} style={s.totalGasto}>
            {formatarMoeda(dados.resumo.totalGasto)} em atendimentos concluídos
          </Animated.Text>
        )}

        {/* ── Próximo horário ── */}
        {dados?.proximo && (
          <Animated.View entering={entrada(2)}>
            <PressableScale style={s.proximo} onPress={() => router.push("/cliente/meus-agendamentos")} accessibilityRole="button">
              <View style={s.proximoIcon}><Icon name="calendar" size={20} color="#FFF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.proximoLabel}>Próximo horário</Text>
                <Text style={s.proximoTitulo} numberOfLines={1}>{dados.proximo.nomeBarbearia}</Text>
                <Text style={s.proximoSub} numberOfLines={1}>
                  {formatarData(dados.proximo.data)} às {dados.proximo.horaInicio.slice(0, 5)} · com {dados.proximo.nomeBarbeiro}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
            </PressableScale>
          </Animated.View>
        )}

        {/* ── Barbearias que frequenta ── */}
        {dados && dados.favoritas.length > 0 && (
          <Animated.View entering={entrada(3)}>
            <Text style={s.secao}>Suas barbearias</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
              {dados.favoritas.map((b) => {
                const foto = fotoUrl(b.foto)
                return (
                  <PressableScale key={b.barbeariaId} style={s.fav} onPress={() => agendarEm(b)} accessibilityRole="button">
                    {foto ? (
                      <Image source={{ uri: foto }} style={s.favFoto} />
                    ) : (
                      <View style={[s.favFoto, s.favFotoVazia]}><Logo altura={22} cor={C.accent} /></View>
                    )}
                    <View style={s.favInfo}>
                      <Text style={s.favNome} numberOfLines={1}>{b.nome}</Text>
                      <Text style={s.favSub}>
                        {b.visitas} {b.visitas === 1 ? "visita" : "visitas"}
                        {b.minhaNota != null ? ` · você deu ${formatarMedia(b.minhaNota)}★` : ""}
                      </Text>
                      <Text style={s.favAgendar}>Agendar de novo</Text>
                    </View>
                  </PressableScale>
                )
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── Dados pessoais ── */}
        {dados && (
          <Animated.View entering={entrada(4)} layout={LinearTransition.duration(MOTION.normal)}>
            <Text style={s.secao}>Dados pessoais</Text>
            <View style={s.grupo}>
              <View style={{ padding: 14, gap: 14 }}>
                <Input label="Nome" icon="person-outline" value={nome} onChangeText={(t) => { setNome(t); setMsgDados(null) }} autoCapitalize="words" />
                <Input
                  label="Telefone / WhatsApp" icon="call-outline" placeholder="(21) 99999-9999" keyboardType="phone-pad"
                  value={telefone} onChangeText={(t) => { setTelefone(t); setMsgDados(null) }}
                />
                <Input label="E-mail" icon="mail-outline" value={p?.email} editable={false} style={{ color: C.muted }} />
                {msgDados && (
                  <Animated.View entering={FadeIn.duration(180)}>
                    <Aviso tipo={msgDados.tipo} icon={msgDados.tipo === "erro" ? "alert-circle" : "checkmark-circle"} texto={msgDados.texto} />
                  </Animated.View>
                )}
                {alterouDados && (
                  <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
                    <Button label="Salvar alterações" icon="checkmark" onPress={salvarDados} loading={salvando} />
                  </Animated.View>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── Conta ── */}
        <Animated.View entering={entrada(5)} layout={LinearTransition.duration(MOTION.normal)}>
          <Text style={s.secao}>Conta</Text>
          <View style={s.grupo}>
            <Opcao icon="calendar-outline" label="Meus agendamentos" onPress={() => router.push("/cliente/meus-agendamentos")} />
            <View style={s.sep} />
            <Opcao
              icon="star-outline"
              label="Avaliar atendimentos"
              onPress={() => router.push({ pathname: "/cliente/meus-agendamentos", params: { aba: "concluido" } })}
            />
            <View style={s.sep} />
            <Opcao
              icon="lock-closed-outline"
              label="Alterar senha"
              onPress={() => { haptic.leve(); setMsgSenha(null); senhaAberta ? fecharSenha() : setSenhaAberta(true) }}
              direita={<Icon name={senhaAberta ? "chevron-up" : "chevron-down"} size={18} color={C.subtle} />}
            />
            {senhaAberta && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={s.senhaForm}>
                <Input label="Senha atual" icon="key-outline" secureTextEntry value={senhaAtual} onChangeText={setSenhaAtual} />
                <Input label="Nova senha" icon="lock-closed-outline" secureTextEntry value={novaSenha} onChangeText={setNovaSenha} placeholder="Mínimo de 6 caracteres" />
                <Input label="Confirmar nova senha" icon="lock-closed-outline" secureTextEntry value={confirmar} onChangeText={setConfirmar} />
                <Button label="Alterar senha" onPress={salvarSenha} loading={trocandoSenha} disabled={!senhaAtual || !novaSenha} />
              </Animated.View>
            )}
          </View>
          {msgSenha && (
            <Animated.View entering={FadeIn.duration(180)} style={{ marginTop: 10 }}>
              <Aviso tipo={msgSenha.tipo} icon={msgSenha.tipo === "erro" ? "alert-circle" : "checkmark-circle"} texto={msgSenha.texto} />
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={entrada(6)} layout={LinearTransition.duration(MOTION.normal)} style={{ marginTop: 24 }}>
          <Button label="Sair da conta" variant="danger" icon="log-out-outline" onPress={sair} loading={saindo} />
        </Animated.View>

        <View style={s.rodape}>
          <Logo variante="nome" altura={18} cor={C.subtle} />
          <Text style={s.versao}>versão {Constants.expoConfig?.version ?? "1.0.0"}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20 },

  topo: { alignItems: "center", paddingTop: 12, paddingBottom: 20, gap: 2 },
  fotoBadge: {
    position: "absolute", right: 0, bottom: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.accent, borderWidth: 3, borderColor: C.bg, alignItems: "center", justifyContent: "center",
  },
  fotoCarregando: {
    ...StyleSheet.absoluteFillObject, borderRadius: 46,
    backgroundColor: "rgba(17,24,39,0.45)", alignItems: "center", justifyContent: "center",
  },
  nome: { fontSize: 22, fontWeight: "800", color: C.text, marginTop: 12, letterSpacing: -0.4 },
  email: { fontSize: 14, color: C.muted },
  desde: { fontSize: 12, color: C.subtle, marginTop: 4 },

  numeros: {
    flexDirection: "row", backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, ...sombra(1),
  },
  numero: { flex: 1, alignItems: "center", gap: 2 },
  numeroValor: { fontSize: 20, fontWeight: "800", color: C.text, marginTop: 4 },
  numeroLabel: { fontSize: 12, color: C.muted },
  numeroSep: { width: 1, backgroundColor: C.border, marginVertical: 4 },
  totalGasto: { fontSize: 12, color: C.muted, textAlign: "center", marginTop: 8 },

  proximo: {
    flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16, padding: 14,
    backgroundColor: C.accent, borderRadius: R.lg, ...sombra(2),
  },
  proximoIcon: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  proximoLabel: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 0.6 },
  proximoTitulo: { fontSize: 16, fontWeight: "800", color: "#FFF", marginTop: 1 },
  proximoSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 },

  secao: { fontSize: 12, fontWeight: "800", color: C.accent, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 24, marginBottom: 10 },

  fav: { width: 200, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, overflow: "hidden", ...sombra(1) },
  favFoto: { width: "100%", height: 90, backgroundColor: C.border },
  favFotoVazia: { backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center" },
  favInfo: { padding: 10, gap: 2 },
  favNome: { fontSize: 14, fontWeight: "700", color: C.text },
  favSub: { fontSize: 12, color: C.muted },
  favAgendar: { fontSize: 12, fontWeight: "700", color: C.accent, marginTop: 4 },

  grupo: { backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, ...sombra(1) },
  opcao: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  opcaoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center" },
  opcaoText: { flex: 1, fontSize: 15, fontWeight: "600", color: C.text },
  sep: { height: 1, backgroundColor: C.border, marginLeft: 60 },
  senhaForm: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },

  rodape: { alignItems: "center", gap: 6, marginTop: 32 },
  versao: { fontSize: 11, color: C.subtle },
})
