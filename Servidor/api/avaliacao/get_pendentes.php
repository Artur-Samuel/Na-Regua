<?php
// get_pendentes.php — agendamentos concluídos do cliente que ainda não foram avaliados
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$clienteId = exigirLogin($conn, "cliente")["userId"]; // vem do token

$stmt = $conn->prepare("
    SELECT a.agendamentoId, a.data, a.horaInicio,
           ba.nome AS nomeBarbearia, u.nome AS nomeBarbeiro
    FROM agendamentos a
    JOIN barbeiros b   ON b.barbeiroId   = a.barbeiroId
    JOIN users u       ON u.userId       = b.userId
    JOIN barbearias ba ON ba.barbeariaId = b.barbeariaId
    LEFT JOIN avaliacoes av ON av.agendamentoId = a.agendamentoId
    WHERE a.clienteId = ? AND a.status = 'concluido' AND av.avaliacaoId IS NULL
    ORDER BY a.data DESC, a.horaInicio DESC
");
$stmt->bind_param("i", $clienteId);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

echo json_encode(["status" => "success", "pendentes" => $rows, "total" => count($rows)]);
