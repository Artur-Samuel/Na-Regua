<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data       = json_decode(file_get_contents("php://input"), true);
$dono        = exigirDono($conn);            // vem do token
$barbeariaId = $dono["barbeariaId"];
$barbeiroId  = intval($data["barbeiroId"] ?? 0);
$userId      = $dono["userId"];

if (!$barbeiroId) {
    echo json_encode(["status" => "error", "message" => "Dados inválidos"]);
    exit;
}

// Garante que o usuário é o dono da barbearia
$check = $conn->prepare("SELECT barbeariaId FROM barbearias WHERE barbeariaId = ? AND criadoPorUserId = ?");
$check->bind_param("ii", $barbeariaId, $userId);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Sem permissão"]);
    exit;
}

// Garante que o barbeiro está disponível (sem barbearia)
$check2 = $conn->prepare("SELECT barbeiroId FROM barbeiros WHERE barbeiroId = ? AND barbeariaId IS NULL");
$check2->bind_param("i", $barbeiroId);
$check2->execute();
if ($check2->get_result()->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Barbeiro não está disponível"]);
    exit;
}

// Insere o convite (UNIQUE evita duplicata pendente)
$stmt = $conn->prepare("INSERT INTO convites (barbeariaId, barbeiroId) VALUES (?, ?)");
$stmt->bind_param("ii", $barbeariaId, $barbeiroId);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "conviteId" => $conn->insert_id]);
} else {
    // Violação do UNIQUE = convite pendente já existe
    echo json_encode(["status" => "error", "message" => "Convite já enviado para este barbeiro"]);
}
