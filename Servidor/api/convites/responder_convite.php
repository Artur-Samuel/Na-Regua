<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data       = json_decode(file_get_contents("php://input"), true);
$conviteId  = intval($data["conviteId"] ?? 0);
$barbeiroId = exigirBarbeiro($conn)["barbeiroId"]; // vem do token
$resposta   = $data["resposta"] ?? "";

if (!$conviteId || !in_array($resposta, ["aceito", "recusado"])) {
    echo json_encode(["status" => "error", "message" => "Dados inválidos"]);
    exit;
}

// Verifica que o convite pertence ao barbeiro e está pendente
$check = $conn->prepare("
    SELECT conviteId, barbeariaId FROM convites
    WHERE conviteId = ? AND barbeiroId = ? AND status = 'pendente'
");
$check->bind_param("ii", $conviteId, $barbeiroId);
$check->execute();
$convite = $check->get_result()->fetch_assoc();

if (!$convite) {
    echo json_encode(["status" => "error", "message" => "Convite não encontrado"]);
    exit;
}

// Se aceitou, verifica que o barbeiro ainda não tem barbearia (vínculo exclusivo)
if ($resposta === "aceito") {
    $checkVinculo = $conn->prepare("SELECT barbeariaId FROM barbeiros WHERE barbeiroId = ?");
    $checkVinculo->bind_param("i", $barbeiroId);
    $checkVinculo->execute();
    $barbeiro = $checkVinculo->get_result()->fetch_assoc();

    if (!is_null($barbeiro["barbeariaId"])) {
        echo json_encode(["status" => "error", "message" => "Você já está vinculado a uma barbearia"]);
        exit;
    }
}

$conn->begin_transaction();
try {
    // Atualiza status do convite
    $stmt = $conn->prepare("UPDATE convites SET status = ?, respondidoEm = NOW() WHERE conviteId = ?");
    $stmt->bind_param("si", $resposta, $conviteId);
    $stmt->execute();

    // Se aceito, vincula o barbeiro à barbearia
    if ($resposta === "aceito") {
        $stmt2 = $conn->prepare("UPDATE barbeiros SET barbeariaId = ?, souDono = FALSE WHERE barbeiroId = ?");
        $stmt2->bind_param("ii", $convite["barbeariaId"], $barbeiroId);
        $stmt2->execute();
    }

    $conn->commit();
    echo json_encode(["status" => "success"]);
} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Erro ao processar resposta"]);
}
