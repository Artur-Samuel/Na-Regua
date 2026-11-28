<?php
// create_agendamento.php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data = json_decode(file_get_contents("php://input"), true);

$clienteId   = exigirLogin($conn, "cliente")["userId"]; // vem do token
$barbeiroId  = intval($data["barbeiroId"] ?? 0);
$dataAg      = $data["data"] ?? "";
$horaInicio  = $data["horaInicio"] ?? "";
$servicoIds  = array_values(array_unique(array_map("intval", (array) ($data["servicoIds"] ?? []))));

if (!$barbeiroId || !$dataAg || !$horaInicio || empty($servicoIds)) {
    echo json_encode(["status" => "error", "message" => "Dados incompletos"]);
    exit;
}

// 1 - Busca serviços e calcula duração total + valor total
$placeholders = implode(",", array_fill(0, count($servicoIds), "?"));
$types        = str_repeat("i", count($servicoIds));

$stmt = $conn->prepare("
    SELECT servicoId, nome, preco, duracaoMin
    FROM servicos
    WHERE servicoId IN ($placeholders) AND barbeiroId = ? AND ativo = TRUE
");
$params = array_merge($servicoIds, [$barbeiroId]);
$stmt->bind_param($types . "i", ...$params);
$stmt->execute();
$servicos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

if (count($servicos) !== count($servicoIds)) {
    echo json_encode(["status" => "error", "message" => "Um ou mais serviços inválidos"]);
    exit;
}

$duracaoTotal = array_sum(array_column($servicos, "duracaoMin"));
$valorTotal   = array_sum(array_column($servicos, "preco"));
$horaFimTs    = strtotime($horaInicio) + ($duracaoTotal * 60);
$horaFim      = date("H:i", $horaFimTs);

// 2 - Verifica conflito de horário (double-booking)
$stmt = $conn->prepare("
    SELECT agendamentoId FROM agendamentos
    WHERE barbeiroId = ?
      AND data = ?
      AND status = 'confirmado'
      AND horaInicio < ?
      AND horaFim > ?
    LIMIT 1
");
$stmt->bind_param("isss", $barbeiroId, $dataAg, $horaFim, $horaInicio);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(["status" => "error", "message" => "Horário não disponível"]);
    exit;
}

// Foto de onde o barbeiro trabalha agora (relatório financeiro da barbearia)
$stmt = $conn->prepare("SELECT barbeariaId FROM barbeiros WHERE barbeiroId = ? LIMIT 1");
$stmt->bind_param("i", $barbeiroId);
$stmt->execute();
$barbeariaId = $stmt->get_result()->fetch_assoc()["barbeariaId"] ?? null;

// 3 - Cria o agendamento em transação
$conn->begin_transaction();

try {
    $stmt = $conn->prepare("
        INSERT INTO agendamentos (clienteId, barbeiroId, barbeariaId, data, horaInicio, horaFim, valorTotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->bind_param("iiisssd", $clienteId, $barbeiroId, $barbeariaId, $dataAg, $horaInicio, $horaFim, $valorTotal);
    $stmt->execute();
    $agendamentoId = $conn->insert_id;

    // 4 - Insere os itens com snapshot de nome e preço
    $stmt2 = $conn->prepare("
        INSERT INTO agendamento_servicos (agendamentoId, servicoId, nomeServicoSnapshot, precoSnapshot)
        VALUES (?, ?, ?, ?)
    ");

    foreach ($servicos as $s) {
        $stmt2->bind_param("iisd", $agendamentoId, $s["servicoId"], $s["nome"], $s["preco"]);
        $stmt2->execute();
    }

    $conn->commit();

    echo json_encode([
        "status"        => "success",
        "agendamentoId" => $agendamentoId,
        "resumo" => [
            "data"        => $dataAg,
            "horaInicio"  => $horaInicio,
            "horaFim"     => $horaFim,
            "valorTotal"  => $valorTotal,
            "duracaoMin"  => $duracaoTotal,
            "servicos"    => array_map(fn($s) => [
                "nome"  => $s["nome"],
                "preco" => $s["preco"]
            ], $servicos)
        ]
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Erro ao criar agendamento"]);
}