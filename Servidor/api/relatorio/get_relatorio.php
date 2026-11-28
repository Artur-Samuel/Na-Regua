<?php
// get_relatorio.php — relatório financeiro do mês (?mes=YYYY-MM, padrão: mês atual)
// Dono: números da barbearia inteira + lista por barbeiro. Funcionário: só os próprios números.
// Faturamento = soma dos agendamentos CONCLUÍDOS (confirmado ainda não virou dinheiro).
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$b = exigirBarbeiro($conn); // vem do token

$mes = $_GET["mes"] ?? date("Y-m");
if (!preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $mes)) {
    echo json_encode(["status" => "error", "message" => "Mês inválido"]);
    exit;
}

$souDono = $b["souDono"] && $b["barbeariaId"];
$escopo  = $souDono ? "barbearia" : "barbeiro";
// Nome da coluna vem desta lista fixa, nunca da requisição
$coluna  = $souDono ? "a.barbeariaId" : "a.barbeiroId";
$id      = $souDono ? $b["barbeariaId"] : $b["barbeiroId"];

$inicio = "$mes-01";
$fim    = date("Y-m-t", strtotime($inicio));

// 1 - Resumo do mês
$stmt = $conn->prepare("
    SELECT
        COUNT(*)                                                         AS total,
        COALESCE(SUM(a.status = 'concluido'), 0)                         AS concluidos,
        COALESCE(SUM(a.status = 'confirmado'), 0)                        AS confirmados,
        COALESCE(SUM(a.status = 'cancelado'), 0)                         AS cancelados,
        COALESCE(SUM(CASE WHEN a.status = 'concluido' THEN a.valorTotal END), 0) AS faturamento
    FROM agendamentos a
    WHERE $coluna = ? AND a.data BETWEEN ? AND ?
");
$stmt->bind_param("iss", $id, $inicio, $fim);
$stmt->execute();
$r = $stmt->get_result()->fetch_assoc();

$concluidos  = (int) $r["concluidos"];
$faturamento = (float) $r["faturamento"];
$resumo = [
    "faturamento" => $faturamento,
    "total"       => (int) $r["total"],
    "concluidos"  => $concluidos,
    "confirmados" => (int) $r["confirmados"],
    "cancelados"  => (int) $r["cancelados"],
    "ticketMedio" => $concluidos ? round($faturamento / $concluidos, 2) : 0,
];

// 2 - Histórico: os 6 meses que terminam no mês escolhido (meses sem movimento vêm zerados)
$historico = [];
for ($i = 5; $i >= 0; $i--) {
    $m = date("Y-m", strtotime("$inicio -$i month"));
    $historico[$m] = ["mes" => $m, "faturamento" => 0.0, "concluidos" => 0];
}
$inicioHist = array_key_first($historico) . "-01";

$stmt = $conn->prepare("
    SELECT DATE_FORMAT(a.data, '%Y-%m') AS mes,
           SUM(a.valorTotal) AS faturamento,
           COUNT(*)          AS concluidos
    FROM agendamentos a
    WHERE $coluna = ? AND a.status = 'concluido' AND a.data BETWEEN ? AND ?
    GROUP BY mes
");
$stmt->bind_param("iss", $id, $inicioHist, $fim);
$stmt->execute();
foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $h) {
    $historico[$h["mes"]]["faturamento"] = (float) $h["faturamento"];
    $historico[$h["mes"]]["concluidos"]  = (int) $h["concluidos"];
}

$resposta = [
    "status"    => "success",
    "escopo"    => $escopo,
    "mes"       => $mes,
    "resumo"    => $resumo,
    "historico" => array_values($historico),
];

// 3 - Por barbeiro (só o dono): equipe atual + quem já saiu mas atendeu aqui no mês
if ($souDono) {
    $bid = $b["barbeariaId"];
    $stmt = $conn->prepare("
        SELECT
            b.barbeiroId,
            u.nome,
            (b.barbeariaId <=> ?) AS naEquipe,
            COUNT(a.agendamentoId)                                           AS total,
            COALESCE(SUM(a.status = 'concluido'), 0)                         AS concluidos,
            COALESCE(SUM(CASE WHEN a.status = 'concluido' THEN a.valorTotal END), 0) AS faturamento
        FROM barbeiros b
        JOIN users u ON u.userId = b.userId
        LEFT JOIN agendamentos a
               ON a.barbeiroId = b.barbeiroId
              AND a.barbeariaId = ?
              AND a.data BETWEEN ? AND ?
        WHERE b.barbeariaId = ?
           OR b.barbeiroId IN (
                SELECT barbeiroId FROM agendamentos
                WHERE barbeariaId = ? AND data BETWEEN ? AND ?
           )
        GROUP BY b.barbeiroId, u.nome, b.barbeariaId
        ORDER BY faturamento DESC, u.nome ASC
    ");
    $stmt->bind_param("iissiiss", $bid, $bid, $inicio, $fim, $bid, $bid, $inicio, $fim);
    $stmt->execute();

    $barbeiros = [];
    foreach ($stmt->get_result()->fetch_all(MYSQLI_ASSOC) as $row) {
        $conc = (int) $row["concluidos"];
        $fat  = (float) $row["faturamento"];
        $barbeiros[] = [
            "barbeiroId"  => (int) $row["barbeiroId"],
            "nome"        => $row["nome"],
            "naEquipe"    => (bool) $row["naEquipe"],
            "total"       => (int) $row["total"],
            "concluidos"  => $conc,
            "faturamento" => $fat,
            "ticketMedio" => $conc ? round($fat / $conc, 2) : 0,
        ];
    }
    $resposta["barbeiros"] = $barbeiros;
}

echo json_encode($resposta);
