<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$userId = exigirLogin($conn, "barbeiro")["userId"]; // vem do token

$stmt = $conn->prepare("
    SELECT barbeiroId, barbeariaId, souDono
    FROM barbeiros
    WHERE userId = ?
    LIMIT 1
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$barbeiro = $stmt->get_result()->fetch_assoc();

if (!$barbeiro) {
    echo json_encode(["status" => "error", "message" => "Barbeiro não encontrado"]);
    exit;
}

$barbearia = null;
if (!is_null($barbeiro["barbeariaId"])) {
    $stmt2 = $conn->prepare("SELECT * FROM barbearias WHERE barbeariaId = ? LIMIT 1");
    $stmt2->bind_param("i", $barbeiro["barbeariaId"]);
    $stmt2->execute();
    $barbearia = $stmt2->get_result()->fetch_assoc() ?: null;
}

echo json_encode([
    "status"    => "success",
    "barbeiro"  => [
        "barbeiroId"  => (int) $barbeiro["barbeiroId"],
        "barbeariaId" => is_null($barbeiro["barbeariaId"]) ? null : (int) $barbeiro["barbeariaId"],
        "souDono"     => (bool) $barbeiro["souDono"],
    ],
    "barbearia" => $barbearia,
]);