// src/components/MapaLeaflet.tsx
// Mapa gratuito (Leaflet + OpenStreetMap) dentro de um WebView.
// Funciona no Expo Go sem chave do Google.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, View } from "react-native"
import { WebView, WebViewMessageEvent } from "react-native-webview"

import { MAPA_LEAFLET_HTML } from "./mapaLeafletHtml"

export type PontoMapa = {
  id: number
  nome: string
  subtitulo: string
  lat: number
  lng: number
}

type Props = {
  pontos: PontoMapa[]
  usuario: { latitude: number; longitude: number } | null
  onAgendar: (id: number) => void
}

export type MapaLeafletRef = {
  centralizarUsuario: () => void
}

const MapaLeaflet = forwardRef<MapaLeafletRef, Props>(function MapaLeaflet({ pontos, usuario, onAgendar }, ref) {
  const webRef = useRef<WebView>(null)
  const [pronto, setPronto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ultimaPosicao = useRef<string | null>(null)

  useImperativeHandle(ref, () => ({
    centralizarUsuario: () => webRef.current?.injectJavaScript("window.centralizarUsuario && window.centralizarUsuario(); true;"),
  }))

  // Manda os dados para a página sempre que mudam (busca filtra, posição chega, refresh)
  useEffect(() => {
    if (!pronto) return
    const chavePosicao = usuario ? `${usuario.latitude},${usuario.longitude}` : null
    // Reenquadra quando a posição do usuário muda; filtrar pela busca não mexe no zoom
    const reenquadrar = chavePosicao !== ultimaPosicao.current
    ultimaPosicao.current = chavePosicao

    const dados = {
      barbearias: pontos,
      usuario: usuario ? { lat: usuario.latitude, lng: usuario.longitude } : null,
      reenquadrar,
    }
    webRef.current?.injectJavaScript(`window.atualizar(${JSON.stringify(dados)}); true;`)
  }, [pronto, pontos, usuario])

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.tipo === "pronto") setPronto(true)
      else if (msg.tipo === "agendar") onAgendar(Number(msg.id))
      else if (msg.tipo === "erro") setErro(msg.mensagem ?? "Erro ao carregar o mapa")
    } catch {
      // mensagem que não é JSON: ignora
    }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webRef}
        source={{ html: MAPA_LEAFLET_HTML, baseUrl: "https://localhost/" }}
        originWhitelist={["*"]}
        onMessage={onMessage}
        onError={() => setErro("Não foi possível carregar o mapa. Verifique a internet.")}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        overScrollMode="never"
        style={{ backgroundColor: "#E5E7EB" }}
      />

      {!pronto && !erro && (
        <View style={s.overlay} pointerEvents="none">
          <ActivityIndicator color="#2563EB" />
        </View>
      )}

      {erro && (
        <View style={s.overlay}>
          <Text style={s.erro}>{erro}</Text>
        </View>
      )}
    </View>
  )
})

export default MapaLeaflet

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#E5E7EB", padding: 16,
  },
  erro: { fontSize: 13, color: "#374151", textAlign: "center" },
})
