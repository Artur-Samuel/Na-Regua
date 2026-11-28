// src/components/PressableScale.tsx
// Pressable que encolhe levemente ao toque (mola na thread de UI).
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native"
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated"

import { MOTION } from "../theme"
import { haptic as vibrar } from "../utils/haptics"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>
  /** Escala no toque. 0.97 para cards grandes, 0.94 para botões pequenos. */
  scaleTo?: number
  /** Vibração leve ao tocar. */
  haptic?: boolean
}

export function PressableScale({ style, scaleTo = 0.97, haptic, onPressIn, onPressOut, onPress, disabled, ...rest }: Props) {
  const scale = useSharedValue(1)
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, MOTION.molaPress)
        onPressIn?.(e)
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, MOTION.molaPress)
        onPressOut?.(e)
      }}
      onPress={(e) => {
        if (haptic) vibrar.toque()
        onPress?.(e)
      }}
      style={[style, animStyle]}
    />
  )
}
