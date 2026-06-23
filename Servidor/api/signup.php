<?php

header("Content-Type: application/json");
require "../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$nome = $data["nome"];
$email = $data["email"];
$senha = password_hash($data["senha"], PASSWORD_DEFAULT);
$telefone = $data["telefone"];
$tipo = $data["tipo"];

// 1️⃣ cria usuário
$sql = "INSERT INTO users (nome, email, senha, telefone, tipo)
        VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $nome, $email, $senha, $telefone, $tipo);

if($stmt->execute()){

    $userId = $stmt->insert_id;

    // 2️⃣ se for barbeiro → cria na tabela barbeiros
    if($tipo === "barbeiro"){

        $sqlBarbeiro = "INSERT INTO barbeiros (userId)
                        VALUES (?)";

        $stmt2 = $conn->prepare($sqlBarbeiro);
        $stmt2->bind_param("i", $userId);
        $stmt2->execute();
    }

    echo json_encode([
        "status" => "success"
    ]);

}else{
    echo json_encode([
        "status" => "error",
        "message" => "Erro ao cadastrar"
    ]);
}