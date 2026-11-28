<?php
// get_perfil.php — dados da conta do usuário logado + resumo de uso (para o perfil do cliente)
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$userId = exigirLogin($conn)["userId"]; // vem do token

$stmt = $conn->prepare("SELECT userId, nome, email, telefone, fotoPerfil, tipo, criadoEm FROM users WHERE userId = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$u = $stmt->get_result()->fetch_assoc();

// Números do cliente. agendamentos antigos não têm barbeariaId: usa a do barbeiro.
$stmt = $conn->prepare("
    SELECT
        SUM(a.status = 'concluido')                                         AS cortes,
        COUNT(DISTINCT CASE WHEN a.status = 'concluido'
              THEN COALESCE(a.barbeariaId, b.barbeariaId) END)              AS barbearias,
        COALESCE(SUM(CASE WHEN a.status = 'concluido' THEN a.valorTotal END), 0) AS totalGasto
    FROM agendamentos a
    JOIN barbeiros b ON b.barbeiroId = a.barbeiroId
    WHERE a.clienteId = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$numeros = $stmt->get_result()->fetch_assoc();

$stmt = $conn->prepare("SELECT COUNT(*) AS total FROM avaliacoes WHERE clienteId = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$avaliacoes = (int) $stmt->get_result()->fetch_assoc()["total"];

// Próximo horário marcado
$stmt = $conn->prepare("
    SELECT a.agendamentoId, a.data, a.horaInicio, ba.nome AS nomeBarbearia, us.nome AS nomeBarbeiro
    FROM agendamentos a
    JOIN barbeiros b   ON b.barbeiroId = a.barbeiroId
    JOIN users us      ON us.userId = b.userId
    JOIN barbearias ba ON ba.barbeariaId = COALESCE(a.barbeariaId, b.barbeariaId)
    WHERE a.clienteId = ? AND a.status = 'confirmado'
      AND (a.data > CURDATE() OR (a.data = CURDATE() AND a.horaInicio >= CURTIME()))
    ORDER BY a.data ASC, a.horaInicio ASC
    LIMIT 1
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$proximo = $stmt->get_result()->fetch_assoc();

// Barbearias que o cliente mais frequenta
$stmt = $conn->prepare("
    SELECT ba.barbeariaId, ba.nome, ba.foto, COUNT(*) AS visitas, MAX(a.data) AS ultimaVisita,
           (SELECT ROUND(AVG(nota), 1) FROM avaliacoes av
             WHERE av.clienteId = a.clienteId AND av.barbeariaId = ba.barbeariaId) AS minhaNota
    FROM agendamentos a
    JOIN barbeiros b   ON b.barbeiroId = a.barbeiroId
    JOIN barbearias ba ON ba.barbeariaId = COALESCE(a.barbeariaId, b.barbeariaId)
    WHERE a.clienteId = ? AND a.status = 'concluido'
    GROUP BY ba.barbeariaId
    ORDER BY visitas DESC, ultimaVisita DESC
    LIMIT 3
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$favoritas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
foreach ($favoritas as &$f) {
    $f["barbeariaId"] = (int) $f["barbeariaId"];
    $f["visitas"]     = (int) $f["visitas"];
    $f["minhaNota"]   = is_null($f["minhaNota"]) ? null : (float) $f["minhaNota"];
    if ($f["foto"] && str_starts_with($f["foto"], "data:")) $f["foto"] = null;
}

echo json_encode([
    "status" => "success",
    "perfil" => [
        "id"       => (int) $u["userId"],
        "nome"     => $u["nome"],
        "email"    => $u["email"],
        "telefone" => $u["telefone"],
        "foto"     => $u["fotoPerfil"],
        "tipo"     => $u["tipo"],
        "criadoEm" => $u["criadoEm"],
    ],
    "resumo" => [
        "cortes"     => (int) $numeros["cortes"],
        "barbearias" => (int) $numeros["barbearias"],
        "avaliacoes" => $avaliacoes,
        "totalGasto" => (float) $numeros["totalGasto"],
    ],
    "proximo"   => $proximo ?: null,
    "favoritas" => $favoritas,
]);
