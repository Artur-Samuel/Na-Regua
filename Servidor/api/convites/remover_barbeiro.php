<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data        = json_decode(file_get_contents("php://input"), true);
$dono        = exigirDono($conn);            // vem do token
$barbeiroId  = intval($data["barbeiroId"] ?? 0);
$barbeariaId = $dono["barbeariaId"];
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

// Garante que não está removendo o próprio dono
$checkDono = $conn->prepare("SELECT souDono FROM barbeiros WHERE barbeiroId = ? AND barbeariaId = ?");
$checkDono->bind_param("ii", $barbeiroId, $barbeariaId);
$checkDono->execute();
$b = $checkDono->get_result()->fetch_assoc();

if (!$b) {
    echo json_encode(["status" => "error", "message" => "Barbeiro não encontrado na equipe"]);
    exit;
}
if ($b["souDono"]) {
    echo json_encode(["status" => "error", "message" => "Não é possível remover o proprietário"]);
    exit;
}

// Desvincula o barbeiro
$stmt = $conn->prepare("UPDATE barbeiros SET barbeariaId = NULL WHERE barbeiroId = ?");
$stmt->bind_param("i", $barbeiroId);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Erro ao remover barbeiro"]);
}
