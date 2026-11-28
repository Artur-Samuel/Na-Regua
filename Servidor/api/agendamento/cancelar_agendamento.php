<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data = json_decode(file_get_contents("php://input"), true);

$agendamentoId = intval($data["agendamentoId"] ?? 0);
$clienteId     = exigirLogin($conn, "cliente")["userId"]; // vem do token

if (!$agendamentoId) {
    echo json_encode(["status" => "error", "message" => "Dados inválidos"]);
    exit;
}

// Garante que pertence ao cliente e ainda está confirmado
$check = $conn->prepare("
    SELECT agendamentoId FROM agendamentos
    WHERE agendamentoId = ? AND clienteId = ? AND status = 'confirmado'
");
$check->bind_param("ii", $agendamentoId, $clienteId);
$check->execute();

if ($check->get_result()->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Agendamento não encontrado ou já cancelado"]);
    exit;
}

$stmt = $conn->prepare("
    UPDATE agendamentos SET status = 'cancelado' WHERE agendamentoId = ?
");
$stmt->bind_param("i", $agendamentoId);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Erro ao cancelar"]);
}