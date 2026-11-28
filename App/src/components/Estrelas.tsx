// src/components/Estrelas.tsx
// Estrelas de 1 a 5. Com onChange vira seletor (tela de avaliar); sem, só exibe.
import { useEffect } from "react"
import { Pressable, View } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated"

import { C } from "../theme"
import { haptic } from "../utils/haptics"

const CINZA = "#D1D5DB"

type Props = {
  nota: number               // pode ser fracionária na exibição (ex.: 4.5 → arredonda)
  tamanho?: number
  onChange?: (nota: number) => void
}

function Estrela({ cheia, tamanho, ordem, animar }: { cheia: boolean; tamanho: number; ordem: number; animar: boolean }) {
  const scale = useSharedValue(1)

  // Ao acender, "pula" — em cascata da esquerda para a direita
  useEffect(() => {
    if (!animar || !cheia) return
    scale.value = withSequence(
      withTiming(1, { duration: ordem * 40 }),
      withTiming(1.3, { duration: 110 }),
      withSpring(1, { damping: 9, stiffness: 260 })
    )
  }, [cheia])

  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Animated.Text style={[{ fontSize: tamanho, color: cheia ? C.star : CINZA, lineHeight: tamanho * 1.2 }, anim]}>
      ★
    </Animated.Text>
  )
}

export default function Estrelas({ nota, tamanho = 16, onChange }: Props) {
  const cheias = Math.round(nota)
  return (
    <View
      style={{ flexDirection: "row", gap: onChange ? 8 : 2 }}
      accessibilityLabel={`${cheias} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const estrela = <Estrela cheia={n <= cheias} tamanho={tamanho} ordem={n - 1} animar={!!onChange} />
        return onChange ? (
          <Pressable
            key={n}
            onPress={() => { haptic.leve(); onChange(n) }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n} estrela${n > 1 ? "s" : ""}`}
          >
            {estrela}
          </Pressable>
        ) : (
          <View key={n}>{estrela}</View>
        )
      })}
    </View>
  )
}

/** "4,5" — formato brasileiro, uma casa. */
export function formatarMedia(media: number) {
  return media.toFixed(1).replace(".", ",")
}
