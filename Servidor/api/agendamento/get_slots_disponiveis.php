<?php
// get_slots_disponiveis.php
// Recebe: barbeiroId, data (YYYY-MM-DD), duracaoTotal (minutos)
// Retorna: lista de horários livres que comportam a duração solicitada
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

exigirLogin($conn);

$barbeiroId   = intval($_GET["barbeiroId"] ?? 0);
$data         = $_GET["data"] ?? "";
$duracaoTotal = intval($_GET["duracaoTotal"] ?? 30);
$SLOT         = 30; // minutos fixos por slot

if (!$barbeiroId || !$data || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
    echo json_encode(["status" => "error", "message" => "Parâmetros inválidos"]);
    exit;
}

// diaSemana: 0=domingo ... 6=sábado (mesmo padrão do schema)
$diaSemana = intval(date('w', strtotime($data)));

// 1 - Busca jornada do barbeiro para esse dia da semana
$stmt = $conn->prepare("
    SELECT horaInicio, horaFim FROM jornadas
    WHERE barbeiroId = ? AND diaSemana = ? AND ativo = TRUE
");
$stmt->bind_param("ii", $barbeiroId, $diaSemana);
$stmt->execute();
$jornadas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

if (empty($jornadas)) {
    echo json_encode(["status" => "success", "slots" => [], "mensagem" => "Barbeiro não trabalha nesse dia"]);
    exit;
}

// 2 - Gera todos os slots de 30min da jornada
function gerarSlots(array $jornadas, int $slot): array {
    $slots = [];
    foreach ($jornadas as $j) {
        $atual = strtotime($j["horaInicio"]);
        $fim   = strtotime($j["horaFim"]);
        while ($atual + ($slot * 60) <= $fim) {
            $slots[] = date("H:i", $atual);
            $atual  += $slot * 60;
        }
    }
    // Faixas sobrepostas (jornadas antigas) não podem gerar o mesmo horário duas vezes
    $slots = array_values(array_unique($slots));
    sort($slots);
    return $slots;
}

$todosSlots = gerarSlots($jornadas, $SLOT);

// 3 - Busca bloqueios do dia
$stmt = $conn->prepare("
    SELECT horaInicio, horaFim FROM bloqueios
    WHERE barbeiroId = ? AND data = ?
");
$stmt->bind_param("is", $barbeiroId, $data);
$stmt->execute();
$bloqueios = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// 4 - Busca agendamentos confirmados do dia
$stmt = $conn->prepare("
    SELECT horaInicio, horaFim FROM agendamentos
    WHERE barbeiroId = ? AND data = ? AND status = 'confirmado'
");
$stmt->bind_param("is", $barbeiroId, $data);
$stmt->execute();
$agendamentos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

// 5 - Marca slots ocupados (por bloqueio ou agendamento)
function slotOcupado(string $slot, array $ocupacoes, int $minSlot): bool {
    $inicio = strtotime($slot);
    $fim    = $inicio + ($minSlot * 60);
    foreach ($ocupacoes as $o) {
        $oInicio = strtotime($o["horaInicio"] ?? "00:00");
        $oFim    = $o["horaFim"] ? strtotime($o["horaFim"]) : strtotime("23:59");
        // Sobreposição
        if ($inicio < $oFim && $fim > $oInicio) return true;
    }
    return false;
}

$ocupacoes = array_merge($bloqueios, $agendamentos);

// 6 - Filtra slots com janela livre suficiente para a duração total
$slotsNecessarios = (int) ceil($duracaoTotal / $SLOT);
$slotsDisponiveis = [];

for ($i = 0; $i <= count($todosSlots) - $slotsNecessarios; $i++) {
    $janelaTodaLivre = true;
    for ($j = 0; $j < $slotsNecessarios; $j++) {
        if (!isset($todosSlots[$i + $j]) || slotOcupado($todosSlots[$i + $j], $ocupacoes, $SLOT)) {
            $janelaTodaLivre = false;
            break;
        }
    }
    if ($janelaTodaLivre) {
        // Calcula horaFim do agendamento
        $inicioTs = strtotime($todosSlots[$i]);
        $fimTs    = $inicioTs + ($duracaoTotal * 60);
        $slotsDisponiveis[] = [
            "horaInicio" => $todosSlots[$i],
            "horaFim"    => date("H:i", $fimTs),
        ];
    }
}

echo json_encode([
    "status" => "success",
    "slots"  => $slotsDisponiveis
]);