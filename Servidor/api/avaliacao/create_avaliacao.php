<?php
// create_avaliacao.php — cliente avalia um agendamento concluído (uma vez só, sem edição)
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$clienteId = exigirLogin($conn, "cliente")["userId"]; // vem do token
$data = json_decode(file_get_contents("php://input"), true);

$agendamentoId = intval($data["agendamentoId"] ?? 0);
$nota          = intval($data["nota"] ?? 0);
$comentario    = trim((string) ($data["comentario"] ?? ""));

if (!$agendamentoId || $nota < 1 || $nota > 5) {
    echo json_encode(["status" => "error", "message" => "Escolha uma nota de 1 a 5"]);
    exit;
}
if (mb_strlen($comentario) > 500) {
    echo json_encode(["status" => "error", "message" => "O comentário pode ter no máximo 500 caracteres"]);
    exit;
}
$comentario = $comentario === "" ? null : $comentario;

// O agendamento precisa ser deste cliente e estar concluído
$stmt = $conn->prepare("
    SELECT a.barbeiroId, b.barbeariaId
    FROM agendamentos a
    JOIN barbeiros b ON b.barbeiroId = a.barbeiroId
    WHERE a.agendamentoId = ? AND a.clienteId = ? AND a.status = 'concluido'
    LIMIT 1
");
$stmt->bind_param("ii", $agendamentoId, $clienteId);
$stmt->execute();
$ag = $stmt->get_result()->fetch_assoc();

if (!$ag) {
    echo json_encode(["status" => "error", "message" => "Só é possível avaliar atendimentos concluídos"]);
    exit;
}
if (is_null($ag["barbeariaId"])) {
    echo json_encode(["status" => "error", "message" => "O barbeiro não está mais vinculado a uma barbearia"]);
    exit;
}

$barbeiroId  = (int) $ag["barbeiroId"];
$barbeariaId = (int) $ag["barbeariaId"];

$stmt = $conn->prepare("
    INSERT INTO avaliacoes (agendamentoId, clienteId, barbeiroId, barbeariaId, nota, comentario)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("iiiiis", $agendamentoId, $clienteId, $barbeiroId, $barbeariaId, $nota, $comentario);

// PHP 8.1+ lança exceção em erro do MySQL; versões antigas só retornam false
try {
    $ok = $stmt->execute();
    $erro = $ok ? 0 : $stmt->errno;
} catch (mysqli_sql_exception $e) {
    $ok = false;
    $erro = $e->getCode();
}

if ($ok) {
    echo json_encode(["status" => "success"]);
} else {
    // 1062 = UNIQUE(agendamentoId): já existe avaliação (ex.: toque duplo no botão)
    if ($erro === 1062) {
        echo json_encode(["status" => "error", "message" => "Este atendimento já foi avaliado"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Erro ao salvar avaliação"]);
    }
}
