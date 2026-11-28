<?php
// get_servicos.php — lista serviços ativos de um barbeiro
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

exigirLogin($conn);

$barbeiroId = intval($_GET["barbeiroId"] ?? 0);

if (!$barbeiroId) {
    echo json_encode(["status" => "error", "message" => "barbeiroId não informado"]);
    exit;
}

$sql = "
    SELECT servicoId, nome, preco, duracaoMin
    FROM servicos
    WHERE barbeiroId = ? AND ativo = TRUE
    ORDER BY nome ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $barbeiroId);
$stmt->execute();
$result = $stmt->get_result();

$servicos = [];
while ($row = $result->fetch_assoc()) {
    $servicos[] = $row;
}

echo json_encode([
    "status"   => "success",
    "servicos" => $servicos
]);