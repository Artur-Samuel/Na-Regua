<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$tipo        = $_GET["tipo"] ?? "";
// Os ids vêm do token: "enviados" exige ser dono, "recebidos" usa o próprio barbeiro
$barbeariaId = $tipo === "enviados"  ? exigirDono($conn)["barbeariaId"]    : 0;
$barbeiroId  = $tipo === "recebidos" ? exigirBarbeiro($conn)["barbeiroId"] : 0;

if ($tipo === "enviados" && $barbeariaId) {
    $sql = "
        SELECT c.conviteId, c.status, c.criadoEm, c.respondidoEm,
               u.nome AS nomeBarbeiro, u.email AS emailBarbeiro,
               b.especialidade
        FROM convites c
        JOIN barbeiros b ON b.barbeiroId = c.barbeiroId
        JOIN users u ON u.userId = b.userId
        WHERE c.barbeariaId = ?
        ORDER BY c.criadoEm DESC
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $barbeariaId);

} elseif ($tipo === "recebidos" && $barbeiroId) {
    $sql = "
        SELECT c.conviteId, c.status, c.criadoEm,
               ba.barbeariaId, ba.nome AS nomeBarbearia,
               ba.endereco, ba.cidade, ba.telefone
        FROM convites c
        JOIN barbearias ba ON ba.barbeariaId = c.barbeariaId
        WHERE c.barbeiroId = ? AND c.status = 'pendente'
        ORDER BY c.criadoEm DESC
    ";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $barbeiroId);

} else {
    echo json_encode(["status" => "error", "message" => "Parâmetros inválidos"]);
    exit;
}

$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
echo json_encode(["status" => "success", "convites" => $rows]);
