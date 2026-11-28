import { forwardRef, useState } from "react"
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from "react-native"

import { C, R } from "../theme"
import { Icon, IconName } from "./Icon"

type Props = TextInputProps & {
  label?: string
  required?: boolean
  error?: string
  icon?: IconName
}

/** Campo com rótulo, ícone, borda de foco, erro e "mostrar senha". */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, required, error, icon, secureTextEntry, multiline, style, onFocus, onBlur, ...props },
  ref
) {
  const [foco, setFoco] = useState(false)
  const [mostrar, setMostrar] = useState(false)
  const corBorda = error ? C.error : foco ? C.accent : C.border

  return (
    <View style={styles.group}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.box,
          multiline && styles.boxMulti,
          { borderColor: corBorda },
          foco && !error && styles.boxFoco,
        ]}
      >
        {icon ? <Icon name={icon} size={18} color={foco ? C.accent : C.subtle} /> : null}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.inputMulti, style]}
          placeholderTextColor={C.subtle}
          secureTextEntry={secureTextEntry && !mostrar}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          onFocus={(e) => { setFoco(true); onFocus?.(e) }}
          onBlur={(e) => { setFoco(false); onBlur?.(e) }}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setMostrar((m) => !m)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={mostrar ? "Esconder senha" : "Mostrar senha"}
          >
            <Icon name={mostrar ? "eye-off-outline" : "eye-outline"} size={20} color={C.subtle} />
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  group: { width: "100%", gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: C.text, letterSpacing: 0.2 },
  required: { color: C.error, fontWeight: "700" },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: 14,
    backgroundColor: C.card,
  },
  boxMulti: { alignItems: "flex-start", paddingVertical: 12 },
  boxFoco: { backgroundColor: C.accentSoft },
  input: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 0, height: 48 },
  inputMulti: { height: undefined, minHeight: 90 },
  error: { fontSize: 12, color: C.error },
})
