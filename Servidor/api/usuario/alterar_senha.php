<?php
// alterar_senha.php — troca a senha do usuário logado (exige a senha atual)
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$userId = exigirLogin($conn)["userId"]; // vem do token
$data   = json_decode(file_get_contents("php://input"), true);

$senhaAtual = $data["senhaAtual"] ?? "";
$novaSenha  = $data["novaSenha"] ?? "";

if (strlen($novaSenha) < 6) {
    echo json_encode(["status" => "error", "message" => "A nova senha precisa ter pelo menos 6 caracteres."]);
    exit;
}

$stmt = $conn->prepare("SELECT senha FROM users WHERE userId = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$hash = $stmt->get_result()->fetch_assoc()["senha"] ?? "";

if (!password_verify($senhaAtual, $hash)) {
    echo json_encode(["status" => "error", "message" => "Senha atual incorreta."]);
    exit;
}

$novoHash = password_hash($novaSenha, PASSWORD_DEFAULT);
$stmt = $conn->prepare("UPDATE users SET senha = ? WHERE userId = ?");
$stmt->bind_param("si", $novoHash, $userId);
$stmt->execute();

echo json_encode(["status" => "success"]);
