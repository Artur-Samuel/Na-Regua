<?php
// config/geocode.php
// Converte "endereço + cidade" em latitude/longitude usando o Nominatim (OpenStreetMap).
// Gratuito, mas com regras de uso: no máximo 1 requisição por segundo, sem processamento
// em lote e com um User-Agent que identifique o app. Por isso só é chamado quando o dono
// cria ou altera o endereço da barbearia — nunca a cada abertura do app.
// https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const GEOCODE_USER_AGENT = "BarbeariaApp/1.0 (projeto academico)";

function httpGetJson(string $url): ?array {
    if (function_exists("curl_init")) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_USERAGENT      => GEOCODE_USER_AGENT,
            CURLOPT_HTTPHEADER     => ["Accept-Language: pt-BR"],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $code !== 200) return null;
    } else {
        $ctx = stream_context_create(["http" => [
            "timeout" => 8,
            "header"  => "User-Agent: " . GEOCODE_USER_AGENT . "\r\nAccept-Language: pt-BR\r\n",
        ]]);
        $body = @file_get_contents($url, false, $ctx);
        if ($body === false) return null;
    }
    $json = json_decode($body, true);
    return is_array($json) ? $json : null;
}

/**
 * Retorna ["latitude" => float, "longitude" => float] ou null se não encontrou.
 * Tenta primeiro a busca estruturada (rua + cidade), que é mais precisa,
 * e depois a busca livre.
 */
function geocodificar(string $endereco, string $cidade): ?array {
    $base = getenv("NOMINATIM_URL") ?: NOMINATIM_URL; // permite apontar para um servidor de teste

    $tentativas = [
        ["street" => $endereco, "city" => $cidade, "country" => "Brasil"],
        ["q" => "$endereco, $cidade, Brasil"],
    ];

    foreach ($tentativas as $i => $params) {
        if ($i > 0) sleep(1); // respeita o limite de 1 req/s do Nominatim
        $params += ["format" => "jsonv2", "limit" => 1, "countrycodes" => "br"];
        $res = httpGetJson($base . "?" . http_build_query($params));
        if (!empty($res[0]["lat"]) && !empty($res[0]["lon"])) {
            return ["latitude" => (float) $res[0]["lat"], "longitude" => (float) $res[0]["lon"]];
        }
    }
    return null;
}
