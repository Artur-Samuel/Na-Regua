import AsyncStorage from "@react-native-async-storage/async-storage"

export const API_URL = "http://192.168.1.9/Servidor/api"

// Chave usada para salvar/ler o usuário logado
export const USER_STORAGE_KEY = "@user"

export type User = {
  id: number
  nome: string
  email: string
  tipo: "cliente" | "barbeiro"
}

/* ── Salva o usuário no dispositivo ── */
export async function saveUser(user: User) {
  await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

/* ── Lê o usuário salvo ── */
export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(USER_STORAGE_KEY)
  return raw ? JSON.parse(raw) : null
}

/* ── Remove o usuário (logout) ── */
export async function removeUser() {
  await AsyncStorage.removeItem(USER_STORAGE_KEY)
}

/* ── Login ── */
export async function login(email: string, senha: string) {
  const response = await fetch(`${API_URL}/login.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  })
  return response.json()
}

/* ── Signup ── */
export async function signup(
  nome: string,
  email: string,
  senha: string,
  telefone: string,
  tipo: string
) {
  const response = await fetch(`${API_URL}/signup.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, senha, telefone, tipo }),
  })
  return response.json()
}

/* ── Criar barbearia ── */
export async function createBarbershop(data: any) {
  const response = await fetch(`${API_URL}/create_barbershop.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return response.json()
}