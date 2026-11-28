<?php
// get_barbershops.php — lista barbearias para o mapa/home.
// Se o app mandar lat/lng do usuário, devolve distanciaKm e ordena da mais próxima
// para a mais distante (barbearias sem coordenadas vão para o fim).
// Para o card da home também vêm: foto, nº de barbeiros, menor preço, se está aberta agora
// e o histórico do cliente logado (visitas concluídas e a nota que ele deu).
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$userId = exigirLogin($conn)["userId"];

$lat = isset($_GET["lat"]) ? floatval($_GET["lat"]) : null;
$lng = isset($_GET["lng"]) ? floatval($_GET["lng"]) : null;
$temPosicao = $lat !== null && $lng !== null && abs($lat) <= 90 && abs($lng) <= 180;

// Fórmula de Haversine (raio da Terra = 6371 km)
$distancia = $temPosicao
    ? "ROUND(6371 * 2 * ASIN(SQRT(
           POWER(SIN(RADIANS(ba.latitude - ?) / 2), 2) +
           COS(RADIANS(?)) * COS(RADIANS(ba.latitude)) *
           POWER(SIN(RADIANS(ba.longitude - ?) / 2), 2)
       )), 2)"
    : "NULL";

// diaSemana: 0=domingo ... 6=sábado — DAYOFWEEK() vai de 1 a 7
$sql = "
    SELECT ba.barbeariaId, ba.nome, ba.descricao, ba.endereco, ba.cidade, ba.telefone, ba.foto,
           ba.latitude, ba.longitude,
           $distancia AS distanciaKm,
           av.mediaAvaliacao, COALESCE(av.totalAvaliacoes, 0) AS totalAvaliacoes,
           COALESCE(eq.totalBarbeiros, 0) AS totalBarbeiros,
           sv.precoMinimo,
           EXISTS (
               SELECT 1 FROM jornadas j
               JOIN barbeiros bj ON bj.barbeiroId = j.barbeiroId
               WHERE bj.barbeariaId = ba.barbeariaId AND j.ativo = TRUE
                 AND j.diaSemana = DAYOFWEEK(CURDATE()) - 1
                 AND CURTIME() >= j.horaInicio AND CURTIME() < j.horaFim
           ) AS abertoAgora,
           COALESCE(mv.minhasVisitas, 0) AS minhasVisitas, mv.ultimaVisita,
           mn.minhaNota
    FROM barbearias ba
    LEFT JOIN (
        SELECT barbeariaId, ROUND(AVG(nota), 1) AS mediaAvaliacao, COUNT(*) AS totalAvaliacoes
        FROM avaliacoes GROUP BY barbeariaId
    ) av ON av.barbeariaId = ba.barbeariaId
    LEFT JOIN (
        SELECT barbeariaId, COUNT(*) AS totalBarbeiros
        FROM barbeiros WHERE barbeariaId IS NOT NULL GROUP BY barbeariaId
    ) eq ON eq.barbeariaId = ba.barbeariaId
    LEFT JOIN (
        SELECT b.barbeariaId, MIN(s.preco) AS precoMinimo
        FROM servicos s JOIN barbeiros b ON b.barbeiroId = s.barbeiroId
        WHERE s.ativo = TRUE GROUP BY b.barbeariaId
    ) sv ON sv.barbeariaId = ba.barbeariaId
    LEFT JOIN (
        -- agendamentos antigos não têm barbeariaId: cai para a barbearia do barbeiro
        SELECT COALESCE(a.barbeariaId, b.barbeariaId) AS barbeariaId,
               COUNT(*) AS minhasVisitas, MAX(a.data) AS ultimaVisita
        FROM agendamentos a JOIN barbeiros b ON b.barbeiroId = a.barbeiroId
        WHERE a.clienteId = ? AND a.status = 'concluido'
        GROUP BY COALESCE(a.barbeariaId, b.barbeariaId)
    ) mv ON mv.barbeariaId = ba.barbeariaId
    LEFT JOIN (
        SELECT barbeariaId, ROUND(AVG(nota), 1) AS minhaNota
        FROM avaliacoes WHERE clienteId = ? GROUP BY barbeariaId
    ) mn ON mn.barbeariaId = ba.barbeariaId
    ORDER BY " . ($temPosicao ? "distanciaKm IS NULL, distanciaKm ASC, " : "") . "ba.criadoEm DESC
";

$stmt = $conn->prepare($sql);
if ($temPosicao) {
    $stmt->bind_param("dddii", $lat, $lat, $lng, $userId, $userId);
} else {
    $stmt->bind_param("ii", $userId, $userId);
}
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// MySQL devolve DECIMAL como string; converte para o app não precisar de Number()
foreach ($rows as &$r) {
    foreach (["latitude", "longitude", "distanciaKm", "mediaAvaliacao", "precoMinimo", "minhaNota"] as $campo) {
        $r[$campo] = is_null($r[$campo]) ? null : (float) $r[$campo];
    }
    foreach (["barbeariaId", "totalAvaliacoes", "totalBarbeiros", "minhasVisitas"] as $campo) {
        $r[$campo] = (int) $r[$campo];
    }
    $r["abertoAgora"] = (bool) $r["abertoAgora"];
    // Versões antigas gravavam base64 cortado em 255 caracteres: imagem inválida
    if ($r["foto"] && str_starts_with($r["foto"], "data:")) $r["foto"] = null;
}

echo json_encode(["status" => "success", "barbearias" => $rows]);
