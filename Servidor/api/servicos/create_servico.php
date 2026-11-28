<?php
// create_servico.php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data = json_decode(file_get_contents("php://input"), true);

$barbeiroId = exigirBarbeiro($conn)["barbeiroId"]; // vem do token
$nome       = trim($data["nome"] ?? "");
$preco      = floatval($data["preco"] ?? 0);
$duracaoMin = intval($data["duracaoMin"] ?? 0);

if (!$nome || $preco <= 0 || $duracaoMin <= 0) {
    echo json_encode(["status" => "error", "message" => "Dados inválidos"]);
    exit;
}

$stmt = $conn->prepare("
    INSERT INTO servicos (barbeiroId, nome, preco, duracaoMin)
    VALUES (?, ?, ?, ?)
");
$stmt->bind_param("isdi", $barbeiroId, $nome, $preco, $duracaoMin);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "servicoId" => $conn->insert_id]);
} else {
    echo json_encode(["status" => "error", "message" => "Erro ao criar serviço"]);
}