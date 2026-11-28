<?php
// save_jornada.php
// Recebe a jornada semanal completa e substitui a anterior.
// Estratégia: DELETE das linhas existentes + INSERT das novas,
// tudo em transação para evitar estado inconsistente.
//
// Payload esperado:
// {
//   "barbeiroId": 1,
//   "jornada": [
//     { "diaSemana": 1, "horaInicio": "09:00", "horaFim": "12:00" },
//     { "diaSemana": 1, "horaInicio": "13:00", "horaFim": "18:00" },
//     { "diaSemana": 2, "horaInicio": "09:00", "horaFim": "18:00" }
//   ]
// }
// Dias ausentes = barbeiro não trabalha naquele dia.

header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$data = json_decode(file_get_contents("php://input"), true);

$barbeiroId = exigirBarbeiro($conn)["barbeiroId"]; // vem do token
$jornada    = $data["jornada"] ?? [];

// Valida cada entrada da jornada
foreach ($jornada as $j) {
    $dia   = intval($j["diaSemana"] ?? -1);
    $inicio = $j["horaInicio"] ?? "";
    $fim    = $j["horaFim"] ?? "";

    if ($dia < 0 || $dia > 6) {
        echo json_encode(["status" => "error", "message" => "diaSemana inválido: $dia"]);
        exit;
    }
    if (!preg_match('/^\d{2}:\d{2}$/', $inicio) || !preg_match('/^\d{2}:\d{2}$/', $fim)) {
        echo json_encode(["status" => "error", "message" => "Formato de hora inválido"]);
        exit;
    }
    if ($fim <= $inicio) {
        echo json_encode(["status" => "error", "message" => "horaFim deve ser maior que horaInicio"]);
        exit;
    }
}

// Faixas do mesmo dia não podem se sobrepor (senão os horários saem duplicados no agendamento)
foreach ($jornada as $i => $a) {
    foreach (array_slice($jornada, $i + 1) as $b) {
        if (intval($a["diaSemana"]) === intval($b["diaSemana"])
            && $a["horaInicio"] < $b["horaFim"] && $b["horaInicio"] < $a["horaFim"]) {
            echo json_encode(["status" => "error", "message" => "Os horários de um mesmo dia não podem se sobrepor"]);
            exit;
        }
    }
}

$conn->begin_transaction();

try {
    // Remove jornada anterior
    $del = $conn->prepare("DELETE FROM jornadas WHERE barbeiroId = ?");
    $del->bind_param("i", $barbeiroId);
    $del->execute();

    // Insere nova jornada
    if (!empty($jornada)) {
        $ins = $conn->prepare("
            INSERT INTO jornadas (barbeiroId, diaSemana, horaInicio, horaFim)
            VALUES (?, ?, ?, ?)
        ");
        foreach ($jornada as $j) {
            $dia    = intval($j["diaSemana"]);
            $inicio = $j["horaInicio"];
            $fim    = $j["horaFim"];
            $ins->bind_param("iiss", $barbeiroId, $dia, $inicio, $fim);
            $ins->execute();
        }
    }

    $conn->commit();
    echo json_encode(["status" => "success"]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Erro ao salvar jornada"]);
}