// src/components/Logo.tsx
// Logo do NaRégua em três recortes (PNG com fundo transparente, recolorível por tintColor).
import { Image, ImageStyle, StyleProp } from "react-native"

import { C } from "../theme"

const ARQUIVOS = {
  /** Régua + bigode */
  marca: { src: require("./images/logo-marca.png"), proporcao: 480 / 282 },
  /** Só o nome "NaRegua" */
  nome: { src: require("./images/logo-nome.png"), proporcao: 600 / 143 },
  /** Marca em cima do nome */
  completa: { src: require("./images/logo-completa.png"), proporcao: 720 / 617 },
}

type Props = {
  variante?: keyof typeof ARQUIVOS
  altura: number
  cor?: string
  style?: StyleProp<ImageStyle>
}

export function Logo({ variante = "marca", altura, cor = C.text, style }: Props) {
  const { src, proporcao } = ARQUIVOS[variante]
  return (
    <Image
      source={src}
      style={[{ height: altura, width: altura * proporcao, tintColor: cor }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="NaRégua"
    />
  )
}
