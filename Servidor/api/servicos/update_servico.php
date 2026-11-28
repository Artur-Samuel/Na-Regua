<?php
// update_servico.php — editar nome/preco/duração ou desativar
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data = json_decode(file_get_contents("php://input"), true);

$servicoId  = intval($data["servicoId"] ?? 0);
$barbeiroId = exigirBarbeiro($conn)["barbeiroId"]; // vem do token
$nome       = trim($data["nome"] ?? "");
$preco      = floatval($data["preco"] ?? 0);
$duracaoMin = intval($data["duracaoMin"] ?? 0);
$ativo      = isset($data["ativo"]) ? (bool)$data["ativo"] : true;

if (!$servicoId || !$nome || $preco <= 0 || $duracaoMin <= 0) {
    echo json_encode(["status" => "error", "message" => "Dados inválidos"]);
    exit;
}

// Garante que o serviço pertence ao barbeiro que está editando
$check = $conn->prepare("SELECT servicoId FROM servicos WHERE servicoId = ? AND barbeiroId = ?");
$check->bind_param("ii", $servicoId, $barbeiroId);
$check->execute();
if ($check->get_result()->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Serviço não encontrado"]);
    exit;
}

$stmt = $conn->prepare("
    UPDATE servicos SET nome = ?, preco = ?, duracaoMin = ?, ativo = ?
    WHERE servicoId = ? AND barbeiroId = ?
");
$ativoInt = (int)$ativo;
$stmt->bind_param("sdiiii", $nome, $preco, $duracaoMin, $ativoInt, $servicoId, $barbeiroId);

if ($stmt->execute()) {
    echo json_encode(["status" => "success"]);
} else {
    echo json_encode(["status" => "error", "message" => "Erro ao atualizar serviço"]);
}