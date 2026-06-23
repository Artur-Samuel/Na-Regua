<?php

header("Content-Type: application/json");
require "../config/database.php";

$userId = $_GET["userId"] ?? null;

if (!$userId) {
    echo json_encode(["status" => "error", "message" => "userId não informado"]);
    exit;
}

// 1️⃣ pega barbeiroId pelo userId
$sql = "SELECT barbeiroId FROM barbeiros WHERE userId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["status" => "empty", "message" => "Barbeiro não encontrado"]);
    exit;
}

$row = $result->fetch_assoc();
$barbeiroId = $row["barbeiroId"];

// 2️⃣ busca a barbearia com todos os dados
$sql = "SELECT * FROM barbearias WHERE barbeiroId = ? LIMIT 1";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $barbeiroId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $barbearia = $result->fetch_assoc();
    echo json_encode([
        "status"    => "success",
        "barbearia" => $barbearia   // ← retorna o objeto completo
    ]);
} else {
    echo json_encode(["status" => "empty", "message" => "Nenhuma barbearia cadastrada"]);
}