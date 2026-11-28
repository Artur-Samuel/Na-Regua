<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$barbeariaId = exigirDono($conn)["barbeariaId"]; // vem do token

$sql = "
    SELECT b.barbeiroId, u.nome, u.email, u.telefone, b.especialidade
    FROM barbeiros b
    JOIN users u ON u.userId = b.userId
    WHERE b.barbeariaId IS NULL
      AND b.souDono = FALSE
      AND b.barbeiroId NOT IN (
          SELECT barbeiroId FROM convites
          WHERE barbeariaId = ? AND status = 'pendente'
      )
    ORDER BY u.nome ASC
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $barbeariaId);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

echo json_encode(["status" => "success", "barbeiros" => $rows]);
