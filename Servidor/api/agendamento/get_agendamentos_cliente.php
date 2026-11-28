<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$clienteId = exigirLogin($conn, "cliente")["userId"]; // vem do token
$status    = $_GET["status"] ?? null;

$statusValidos = ["confirmado", "concluido", "cancelado"];
if ($status && !in_array($status, $statusValidos)) {
    echo json_encode(["status" => "error", "message" => "Status inválido"]);
    exit;
}

$where  = "a.clienteId = ?";
$params = [$clienteId];
$types  = "i";

if ($status) {
    $where   .= " AND a.status = ?";
    $params[] = $status;
    $types   .= "s";
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
        u.nome        AS nomeBarbeiro,
        ba.nome       AS nomeBarbearia,
        ba.endereco   AS enderecoBarbearia,
        ba.cidade     AS cidadeBarbearia,
        av.nota       AS notaAvaliacao,
        GROUP_CONCAT(
            ag_s.nomeServicoSnapshot
            ORDER BY ag_s.agendamentoServicoId
            SEPARATOR ', '
        ) AS servicos
    FROM agendamentos a
    JOIN barbeiros b   ON b.barbeiroId  = a.barbeiroId
    JOIN users u       ON u.userId      = b.userId
    JOIN barbearias ba ON ba.barbeariaId = b.barbeariaId
    LEFT JOIN agendamento_servicos ag_s ON ag_s.agendamentoId = a.agendamentoId
    LEFT JOIN avaliacoes av ON av.agendamentoId = a.agendamentoId
    WHERE $where
    GROUP BY a.agendamentoId
    ORDER BY a.data DESC, a.horaInicio DESC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// notaAvaliacao: null = ainda não avaliado
foreach ($rows as &$r) {
    $r["notaAvaliacao"] = is_null($r["notaAvaliacao"]) ? null : (int) $r["notaAvaliacao"];
}
unset($r);

echo json_encode([
    "status"       => "success",
    "agendamentos" => $rows
]);