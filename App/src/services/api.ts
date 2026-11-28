import AsyncStorage from "@react-native-async-storage/async-storage"
import { router } from "expo-router"

export const API_URL = "http://172.17.68.114/Servidor/api"
/** Raiz do servidor: as fotos enviadas ficam em <SERVIDOR_URL>/uploads/... */
export const SERVIDOR_URL = API_URL.replace(/\/api$/, "")

/**
 * Caminho de foto salvo no banco → URL que o <Image> consegue abrir.
 * Ignora base64 antigo (era cortado em 255 caracteres e nunca abria).
 */
export function fotoUrl(caminho?: string | null): string | null {
  if (!caminho || caminho.startsWith("data:")) return null
  if (/^(https?|file):/.test(caminho)) return caminho
  return `${SERVIDOR_URL}/${caminho}`
}

export const USER_STORAGE_KEY = "@user"
export const TOKEN_STORAGE_KEY = "@token"

export type User = {
  id: number
  nome: string
  email: string
  tipo: "cliente" | "barbeiro"
  foto?: string | null
}

/* ── Usuário e sessão ── */
export async function saveUser(user: User) {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

/** Sem token = não está logado (inclui quem logou antes desta versão). */
export async function getUser(): Promise<User | null> {
  const [raw, token] = await Promise.all([
    AsyncStorage.getItem(USER_STORAGE_KEY),
    AsyncStorage.getItem(TOKEN_STORAGE_KEY),
  ])
  return raw && token ? JSON.parse(raw) : null
}

async function getToken() {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY)
}

async function limparSessaoLocal() {
  await AsyncStorage.multiRemove([USER_STORAGE_KEY, TOKEN_STORAGE_KEY])
}

/** Logout: apaga a sessão no servidor e no aparelho. */
export async function removeUser() {
  const token = await getToken()
  if (token) {
    // Se o servidor estiver fora do ar, o logout local acontece mesmo assim
    fetch(`${API_URL}/auth/logout.php`, { method: "POST", headers: { "X-Token": token } }).catch(() => {})
  }
  await limparSessaoLocal()
}

/**
 * fetch com o token. Toda chamada protegida passa por aqui.
 * Se o servidor responder 401 (token inválido/vencido), desloga e volta ao login.
 */
async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { "X-Token": token } : {}),
      ...(init.headers ?? {}),
    },
  })

  if (res.status === 401) {
    await limparSessaoLocal()
    router.replace("/auth")
  }
  return res.json()
}

const get = (path: string) => apiFetch(path)
const post = (path: string, body: any) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) })

/* ── Auth (públicas, sem token) ── */
export async function login(email: string, senha: string) {
  const res = await fetch(`${API_URL}/auth/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  })
  const data = await res.json()
  if (data.status === "success" && data.token) {
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, data.token)
  }
  return data
}

export async function signup(
  nome: string,
  email: string,
  senha: string,
  telefone: string,
  tipo: string
) {
  const res = await fetch(`${API_URL}/auth/signup.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, senha, telefone, tipo }),
  })
  return res.json()
}

/*
 * Daqui pra baixo tudo exige login.
 * Os parâmetros userId / clienteId / barbeiroId continuam nas assinaturas
 * para as telas não precisarem mudar, mas o servidor IGNORA esses valores
 * e usa o usuário do token.
 */

/* ── Perfil do usuário ── */
export type Perfil = {
  perfil: User & { telefone: string | null; criadoEm: string }
  resumo: { cortes: number; barbearias: number; avaliacoes: number; totalGasto: number }
  proximo: { agendamentoId: number; data: string; horaInicio: string; nomeBarbearia: string; nomeBarbeiro: string } | null
  favoritas: { barbeariaId: number; nome: string; foto: string | null; visitas: number; ultimaVisita: string; minhaNota: number | null }[]
}

export const getPerfil = () => get("/usuario/get_perfil.php")

/** foto: data URI só quando é uma foto nova; removerFoto volta para a inicial do nome. */
export const updatePerfil = (data: { nome: string; telefone: string; foto?: string; removerFoto?: boolean }) =>
  post("/usuario/update_perfil.php", data)

export const alterarSenha = (senhaAtual: string, novaSenha: string) =>
  post("/usuario/alterar_senha.php", { senhaAtual, novaSenha })

/* ── Barbearia ── */
export const createBarbershop = (data: any) => post("/barbearia/create_barbershop.php", data)

export const getBarbershopByUser = (_userId?: number) => get("/barbearia/get_barbershop_by_user.php")

/** Com a posição do usuário, o servidor devolve distanciaKm e ordena pela mais próxima. */
export const getBarbershops = (pos?: { latitude: number; longitude: number } | null) =>
  get(`/barbearia/get_barbershops.php${pos ? `?lat=${pos.latitude}&lng=${pos.longitude}` : ""}`)

export const getBarbeirosByBarbearia = (barbeariaId: number) =>
  get(`/barbearia/get_barbeiros_by_barbearia.php?barbeariaId=${barbeariaId}`)

export const getBarbeiroByUserId = (_userId?: number) => get("/barbearia/get_barbeiro_by_user.php")

export const updateBarbershop = (data: any) => post("/barbearia/update_barbershop.php", data)

/* ── Serviços ── */
export const createServico = (data: any) => post("/servicos/create_servico.php", data)

export const updateServico = (data: any) => post("/servicos/update_servico.php", data)

export const getServicos = (barbeiroId: number) => get(`/servicos/get_servicos.php?barbeiroId=${barbeiroId}`)

/* ── Jornada ── */
export const saveJornada = (data: any) => post("/jornada/save_jornada.php", data)

export const getJornada = (barbeiroId: number) => get(`/jornada/get_jornada.php?barbeiroId=${barbeiroId}`)

/* ── Agendamento ── */
export const createAgendamento = (data: any) => post("/agendamento/create_agendamento.php", data)

export const getSlotsDisponiveis = (barbeiroId: number, data: string, duracaoTotal: number) =>
  get(`/agendamento/get_slots_disponiveis.php?barbeiroId=${barbeiroId}&data=${data}&duracaoTotal=${duracaoTotal}`)

/* ── Agendamentos do cliente ── */
export const getAgendamentosCliente = (_clienteId?: number, status?: string) =>
  get(`/agendamento/get_agendamentos_cliente.php${status ? `?status=${status}` : ""}`)

export const cancelarAgendamento = (agendamentoId: number, _clienteId?: number) =>
  post("/agendamento/cancelar_agendamento.php", { agendamentoId })

/* ── Agendamentos do barbeiro ── */
export const getAgendamentosBarbeiro = (_barbeiroId: number | undefined, status: string) =>
  get(`/agendamento/get_agendamentos_barbeiro.php?status=${status}`)

export const cancelarAgendamentoBarbeiro = (agendamentoId: number, _barbeiroId?: number) =>
  post("/agendamento/cancelar_agendamento_barbeiro.php", { agendamentoId })

export const concluirAgendamento = (agendamentoId: number, _barbeiroId?: number) =>
  post("/agendamento/concluir_agendamento.php", { agendamentoId })

/* ── Avaliações ── */
export const createAvaliacao = (data: { agendamentoId: number; nota: number; comentario?: string }) =>
  post("/avaliacao/create_avaliacao.php", data)

/** Agendamentos concluídos do cliente logado que ainda não foram avaliados. */
export const getAvaliacoesPendentes = () => get("/avaliacao/get_pendentes.php")

/** Resumo + lista das avaliações da barbearia do barbeiro logado. */
export const getAvaliacoesBarbearia = (limite?: number) =>
  get(`/avaliacao/get_avaliacoes_barbearia.php${limite ? `?limite=${limite}` : ""}`)

/** AsyncStorage: último avaliacaoId que o barbeiro já viu (selo "novas" do dashboard). */
export const chaveAvaliacaoVista = (barbeariaId: number) => `@avaliacaoVista:${barbeariaId}`

/* ── Relatório financeiro ── */
export type RelatorioFinanceiro = {
  escopo: "barbearia" | "barbeiro"
  mes: string
  resumo: {
    faturamento: number
    total: number
    concluidos: number
    confirmados: number
    cancelados: number
    ticketMedio: number
  }
  historico: { mes: string; faturamento: number; concluidos: number }[]
  /** Só vem para o dono. */
  barbeiros?: {
    barbeiroId: number
    nome: string
    naEquipe: boolean
    total: number
    concluidos: number
    faturamento: number
    ticketMedio: number
  }[]
}

/** mes = "YYYY-MM". Dono recebe a barbearia inteira; funcionário, só os próprios números. */
export const getRelatorioFinanceiro = (mes: string) => get(`/relatorio/get_relatorio.php?mes=${mes}`)

/* ── Convites ── */
export const getBarbeirosDisponiveis = (_barbeariaId?: number) => get("/convites/get_barbeiros_disponiveis.php")

export const criarConvite = (data: any) => post("/convites/criar_convite.php", data)

export const getConvites = (params: { barbeariaId?: number; barbeiroId?: number; tipo: string }) =>
  get(`/convites/get_convites.php?tipo=${params.tipo}`)

export const responderConvite = (data: any) => post("/convites/responder_convite.php", data)

export const removerBarbeiro = (data: any) => post("/convites/remover_barbeiro.php", data)
