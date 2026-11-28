<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$barbeiroId = exigirBarbeiro($conn)["barbeiroId"]; // vem do token
$status     = $_GET["status"] ?? "confirmado";

$statusValidos = ["confirmado", "concluido", "cancelado"];
if (!in_array($status, $statusValidos)) {
    echo json_encode(["status" => "error", "message" => "Status inválido"]);
    exit;
}

$sql = "
    SELECT
        a.agendamentoId,
        a.data,
        a.horaInicio,
        a.horaFim,
        a.valorTotal,
        a.status,
        a.criadoEm,
        u.nome  AS nomeCliente,
        u.email AS emailCliente,
        u.telefone AS telefoneCliente,
        GROUP_CONCAT(
            ag_s.nomeServicoSnapshot
            ORDER BY ag_s.agendamentoServicoId
            SEPARATOR ', '
        ) AS servicos,
        SUM(ag_s.precoSnapshot) AS totalServicos
    FROM agendamentos a
    JOIN users u ON u.userId = a.clienteId
    LEFT JOIN agendamento_servicos ag_s ON ag_s.agendamentoId = a.agendamentoId
    WHERE a.barbeiroId = ? AND a.status = ?
    GROUP BY a.agendamentoId
    ORDER BY a.data ASC, a.horaInicio ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("is", $barbeiroId, $status);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

echo json_encode([
    "status"       => "success",
    "agendamentos" => $rows,
]);