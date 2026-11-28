// src/components/mapaLeafletHtml.ts
// Página HTML que roda DENTRO do WebView. Leaflet + imagens do OpenStreetMap:
// gratuito e sem chave de API. A política de uso do OSM exige o crédito visível
// e uso moderado (ok para o projeto; um app com muitos usuários precisaria de outro provedor). O app conversa com esta página assim:
//   app → página: injectJavaScript("window.atualizar({...})") e "window.centralizarUsuario()"
//   página → app: window.ReactNativeWebView.postMessage(JSON) com { tipo: "pronto" | "agendar" | "erro" }

export const MAPA_LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #E5E7EB; }
  .pin-barbearia {
    width: 30px; height: 38px; position: relative;
  }
  .pin-barbearia svg { width: 30px; height: 38px; display: block; }
  .popup-nome { font: 700 14px sans-serif; color: #111827; }
  .popup-sub  { font: 12px sans-serif; color: #6B7280; margin: 2px 0 8px; }
  .popup-btn {
    display: block; width: 100%; border: 0; border-radius: 8px; padding: 8px 0;
    background: #2563EB; color: #fff; font: 700 13px sans-serif;
  }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  function enviar(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }
  window.onerror = function (m) { enviar({ tipo: "erro", mensagem: String(m) }); };

  if (typeof L === "undefined") {
    enviar({ tipo: "erro", mensagem: "Leaflet não carregou (sem internet?)" });
  } else {
    var map = L.map("map", { zoomControl: false }).setView([-22.759, -43.451], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    var camadaBarbearias = L.layerGroup().addTo(map);
    var camadaUsuario = L.layerGroup().addTo(map);
    var usuario = null;
    var jaEnquadrou = false;

    var svgPin = '<svg viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.716 0 0 6.716 0 15c0 10.313 13.5 23 15 23S30 25.313 30 15C30 6.716 23.284 0 15 0z" fill="#DC2626"/><circle cx="15" cy="15" r="6" fill="#fff"/></svg>';
    var iconePin = L.divIcon({ className: "", html: '<div class="pin-barbearia">' + svgPin + '</div>', iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -40] });

    function escapar(t) {
      return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }

    function enquadrar(barbearias) {
      var pontos = barbearias.map(function (b) { return [b.lat, b.lng]; });
      // Só inclui o usuário se estiver perto (~50 km); senão o zoom vai para o país inteiro
      if (usuario && pontos.every(function (p) { return Math.abs(p[0] - usuario[0]) < 0.5 && Math.abs(p[1] - usuario[1]) < 0.5; })) {
        pontos.push(usuario);
      }
      if (pontos.length === 0) return;
      // O WebView pode ter mudado de tamanho depois que o mapa foi criado; sem isso o
      // Leaflet calcula o enquadramento com o tamanho errado
      map.invalidateSize();
      if (pontos.length === 1) map.setView(pontos[0], 15);
      else map.fitBounds(pontos, { padding: [40, 40], maxZoom: 15 });
    }

    // Chamado pelo app sempre que a lista (busca) ou a posição mudam
    window.atualizar = function (dados) {
      camadaBarbearias.clearLayers();
      (dados.barbearias || []).forEach(function (b) {
        var html =
          '<div class="popup-nome">' + escapar(b.nome) + "</div>" +
          '<div class="popup-sub">' + escapar(b.subtitulo) + "</div>" +
          '<button class="popup-btn" onclick="enviar({tipo:\\'agendar\\',id:' + Number(b.id) + '})">Agendar</button>';
        L.marker([b.lat, b.lng], { icon: iconePin }).bindPopup(html, { minWidth: 160 }).addTo(camadaBarbearias);
      });

      camadaUsuario.clearLayers();
      usuario = dados.usuario ? [dados.usuario.lat, dados.usuario.lng] : null;
      if (usuario) {
        L.circleMarker(usuario, { radius: 14, stroke: false, fillColor: "#2563EB", fillOpacity: 0.18 }).addTo(camadaUsuario);
        L.circleMarker(usuario, { radius: 7, color: "#fff", weight: 3, fillColor: "#2563EB", fillOpacity: 1 }).addTo(camadaUsuario);
      }

      if (!jaEnquadrou || dados.reenquadrar) {
        enquadrar(dados.barbearias || []);
        jaEnquadrou = true;
      }
    };

    window.centralizarUsuario = function () {
      if (usuario) map.setView(usuario, 15);
    };

    enviar({ tipo: "pronto" });
  }
</script>
</body>
</html>`
