<?php
// signup.php
header("Content-Type: application/json");
require "../../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$nome     = trim($data["nome"] ?? "");
$email    = trim($data["email"] ?? "");
$senha    = $data["senha"] ?? "";
$telefone = trim($data["telefone"] ?? "");
$tipo     = $data["tipo"] ?? "";

// Validação básica
if (!$nome || !$email || !$senha || !in_array($tipo, ["cliente", "barbeiro"])) {
    echo json_encode(["status" => "error", "message" => "Dados inválidos"]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "E-mail inválido"]);
    exit;
}

$senhaHash = password_hash($senha, PASSWORD_DEFAULT);

// 1️⃣ Cria o usuário
$sql = "INSERT INTO users (nome, email, senha, telefone, tipo) VALUES (?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sssss", $nome, $email, $senhaHash, $telefone, $tipo);

if (!$stmt->execute()) {
    // Violação de UNIQUE no email
    if ($conn->errno === 1062) {
        echo json_encode(["status" => "error", "message" => "E-mail já cadastrado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Erro ao cadastrar usuário"]);
    }
    exit;
}

$userId = $stmt->insert_id;

// 2️⃣ Se for barbeiro, cria a linha em barbeiros com barbeariaId NULL
// (profissional "órfão" — sem vínculo até criar ou ser convidado para uma barbearia)
if ($tipo === "barbeiro") {
    $sqlBarbeiro = "INSERT INTO barbeiros (userId, barbeariaId, souDono) VALUES (?, NULL, FALSE)";
    $stmt2 = $conn->prepare($sqlBarbeiro);
    $stmt2->bind_param("i", $userId);
    if (!$stmt2->execute()) {
        echo json_encode(["status" => "error", "message" => "Erro ao criar perfil de barbeiro"]);
        exit;
    }
}

echo json_encode(["status" => "success"]);