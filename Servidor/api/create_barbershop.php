<?php

header("Content-Type: application/json");
require "../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$userId = $data["userId"];
$nome = $data["nome"];
$descricao = $data["descricao"];
$endereco = $data["endereco"];
$cidade = $data["cidade"];
$latitude = $data["latitude"];
$longitude = $data["longitude"];
$telefone = $data["telefone"];

// 1️⃣ pega barbeiroId pelo userId
$sql = "SELECT barbeiroId FROM barbeiros WHERE userId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();

$result = $stmt->get_result();

if($result->num_rows === 0){
    echo json_encode([
        "status" => "error",
        "message" => "Barbeiro não encontrado"
    ]);
    exit;
}

$row = $result->fetch_assoc();
$barbeiroId = $row["barbeiroId"];

// 2️⃣ cria barbearia
$sql = "INSERT INTO barbearias 
(nome, descricao, endereco, cidade, latitude, longitude, telefone, barbeiroId)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "ssssddsi",
    $nome,
    $descricao,
    $endereco,
    $cidade,
    $latitude,
    $longitude,
    $telefone,
    $barbeiroId
);

if($stmt->execute()){
    echo json_encode(["status" => "success"]);
}else{
    echo json_encode([
        "status" => "error",
        "message" => "Erro ao criar barbearia"
    ]);
}