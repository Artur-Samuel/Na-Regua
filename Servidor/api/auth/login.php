<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data  = json_decode(file_get_contents("php://input"), true);
$email = trim($data["email"] ?? "");
$senha = $data["senha"] ?? "";

if (!$email || !$senha) {
    echo json_encode(["status" => "error", "message" => "Informe e-mail e senha"]);
    exit;
}

$stmt = $conn->prepare("SELECT userId, nome, email, senha, tipo, fotoPerfil FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || !password_verify($senha, $user["senha"])) {
    echo json_encode(["status" => "error", "message" => "E-mail ou senha incorretos"]);
    exit;
}

$token = criarSessao($conn, (int) $user["userId"]);

echo json_encode([
    "status" => "success",
    "token"  => $token,
    "user"   => [
        "id"    => (int) $user["userId"],
        "nome"  => $user["nome"],
        "email" => $user["email"],
        "tipo"  => $user["tipo"],
        "foto"  => $user["fotoPerfil"],
    ],
]);
