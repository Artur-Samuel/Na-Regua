<?php
// get_jornada.php — retorna jornada semanal de um barbeiro
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

exigirLogin($conn);

$barbeiroId = intval($_GET["barbeiroId"] ?? 0);

if (!$barbeiroId) {
    echo json_encode(["status" => "error", "message" => "barbeiroId não informado"]);
    exit;
}

$stmt = $conn->prepare("
    SELECT jornadaId, diaSemana, horaInicio, horaFim, ativo
    FROM jornadas
    WHERE barbeiroId = ?
    ORDER BY diaSemana ASC, horaInicio ASC
");
$stmt->bind_param("i", $barbeiroId);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

echo json_encode([
    "status"   => "success",
    "jornada"  => $rows
]);