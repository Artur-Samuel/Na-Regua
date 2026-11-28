<?php
// update_perfil.php — nome, telefone e foto do usuário logado.
// foto: data URI = foto nova; removerFoto: true = volta para a inicial do nome.
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";
require "../../config/upload.php";

$userId = exigirLogin($conn)["userId"]; // vem do token
$data   = json_decode(file_get_contents("php://input"), true);

$nome        = trim($data["nome"] ?? "");
$telefone    = trim($data["telefone"] ?? "");
$foto        = $data["foto"] ?? null;
$removerFoto = !empty($data["removerFoto"]);

if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) {
    echo json_encode(["status" => "error", "message" => "Informe um nome entre 2 e 100 caracteres."]);
    exit;
}
if (strlen(preg_replace('/\D/', '', $telefone)) > 0 && strlen(preg_replace('/\D/', '', $telefone)) < 10) {
    echo json_encode(["status" => "error", "message" => "Telefone incompleto. Use DDD + número."]);
    exit;
}

$stmt = $conn->prepare("SELECT fotoPerfil FROM users WHERE userId = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$fotoAtual = $stmt->get_result()->fetch_assoc()["fotoPerfil"];

$novaFoto = $fotoAtual;
if (ehImagemNova($foto)) {
    $novaFoto = salvarImagemBase64($foto, "usuarios", "usuario_$userId", $fotoAtual);
    if (!$novaFoto) {
        echo json_encode(["status" => "error", "message" => "Não foi possível salvar a foto. Tente outra imagem (JPG ou PNG, até 5 MB)."]);
        exit;
    }
} elseif ($removerFoto) {
    if ($fotoAtual && str_starts_with($fotoAtual, "uploads/usuarios/")) @unlink(dirname(__DIR__, 2) . "/$fotoAtual");
    $novaFoto = null;
}

$stmt = $conn->prepare("UPDATE users SET nome = ?, telefone = ?, fotoPerfil = ? WHERE userId = ?");
$stmt->bind_param("sssi", $nome, $telefone, $novaFoto, $userId);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "nome" => $nome, "telefone" => $telefone, "foto" => $novaFoto]);
} else {
    echo json_encode(["status" => "error", "message" => "Erro ao salvar o perfil"]);
}
