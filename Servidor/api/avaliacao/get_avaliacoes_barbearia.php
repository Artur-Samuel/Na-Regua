<?php
// get_avaliacoes_barbearia.php — avaliações da barbearia do barbeiro logado (dono ou funcionário)
// ?limite=N limita a lista (o resumo — média, total, distribuição — é sempre da barbearia inteira)
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$barbeariaId = exigirBarbeiro($conn)["barbeariaId"]; // vem do token
if (!$barbeariaId) {
    echo json_encode(["status" => "error", "message" => "Você não está vinculado a uma barbearia"]);
    exit;
}

$limite = isset($_GET["limite"]) ? max(1, min(200, intval($_GET["limite"]))) : 200;

// Resumo
$stmt = $conn->prepare("
    SELECT COUNT(*) AS total, ROUND(AVG(nota), 1) AS media,
           SUM(nota = 5) AS n5, SUM(nota = 4) AS n4, SUM(nota = 3) AS n3,
           SUM(nota = 2) AS n2, SUM(nota = 1) AS n1
    FROM avaliacoes WHERE barbeariaId = ?
");
$stmt->bind_param("i", $barbeariaId);
$stmt->execute();
$r = $stmt->get_result()->fetch_assoc();

$resumo = [
    "total" => (int) $r["total"],
    "media" => is_null($r["media"]) ? null : (float) $r["media"],
    "distribuicao" => [
        "5" => (int) $r["n5"], "4" => (int) $r["n4"], "3" => (int) $r["n3"],
        "2" => (int) $r["n2"], "1" => (int) $r["n1"],
    ],
];

// Lista (mais recentes primeiro). Do cliente só vai o primeiro nome.
$stmt = $conn->prepare("
    SELECT av.avaliacaoId, av.nota, av.comentario, av.criadoEm,
           SUBSTRING_INDEX(uc.nome, ' ', 1) AS nomeCliente,
           ub.nome AS nomeBarbeiro,
           a.data AS dataAtendimento
    FROM avaliacoes av
    JOIN users uc       ON uc.userId      = av.clienteId
    JOIN barbeiros b    ON b.barbeiroId   = av.barbeiroId
    JOIN users ub       ON ub.userId      = b.userId
    JOIN agendamentos a ON a.agendamentoId = av.agendamentoId
    WHERE av.barbeariaId = ?
    ORDER BY av.criadoEm DESC, av.avaliacaoId DESC
    LIMIT ?
");
$stmt->bind_param("ii", $barbeariaId, $limite);
$stmt->execute();
$lista = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

foreach ($lista as &$a) {
    $a["avaliacaoId"] = (int) $a["avaliacaoId"];
    $a["nota"] = (int) $a["nota"];
}

echo json_encode(["status" => "success", "resumo" => $resumo, "avaliacoes" => $lista]);
