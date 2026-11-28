// src/utils/imagem.ts
// Escolha de foto na galeria, já reduzida e em JPEG, pronta para mandar à API.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator"
import * as ImagePicker from "expo-image-picker"
import { Alert } from "react-native"

type Opcoes = {
  /** Proporção do recorte, ex.: [1, 1] para avatar, [16, 9] para capa. */
  aspecto: [number, number]
  /** Maior lado da imagem final, em px. */
  larguraMax?: number
}

/** Abre a galeria e devolve um data URI JPEG, ou null se o usuário cancelar. */
export async function escolherImagem({ aspecto, larguraMax = 1080 }: Opcoes): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== "granted") {
    Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para escolher a foto.")
    return null
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: aspecto,
    quality: 1,
  })
  if (result.canceled || !result.assets[0]) return null

  // Foto da câmera chega com vários MB: reduz antes de virar base64
  const asset = result.assets[0]
  const ctx = ImageManipulator.manipulate(asset.uri)
  if (asset.width > larguraMax) ctx.resize({ width: larguraMax })
  const imagem = await ctx.renderAsync()
  const salva = await imagem.saveAsync({ base64: true, compress: 0.75, format: SaveFormat.JPEG })

  return salva.base64 ? `data:image/jpeg;base64,${salva.base64}` : null
}
