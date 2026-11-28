<?php
// get_barbeiros_by_barbearia.php — lista profissionais de uma barbearia
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

exigirLogin($conn);

$barbeariaId = intval($_GET["barbeariaId"] ?? 0);

if (!$barbeariaId) {
    echo json_encode(["status" => "error", "message" => "barbeariaId não informado"]);
    exit;
}

$sql = "
    SELECT b.barbeiroId, b.souDono, b.especialidade, b.descricao, u.nome, u.fotoPerfil
    FROM barbeiros b
    JOIN users u ON u.userId = b.userId
    WHERE b.barbeariaId = ?
    ORDER BY b.souDono DESC, u.nome ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $barbeariaId);
$stmt->execute();
$result = $stmt->get_result();

$barbeiros = [];
while ($row = $result->fetch_assoc()) {
    $barbeiros[] = $row;
}

echo json_encode([
    "status"    => "success",
    "barbeiros" => $barbeiros
]);