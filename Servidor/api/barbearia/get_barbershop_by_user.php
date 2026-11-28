<?php
// get_barbershop_by_user.php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$userId = exigirLogin($conn, "barbeiro")["userId"]; // vem do token

// Busca barbearia onde esse usuário é dono
// JOIN: users -> barbeiros -> barbearias
$sql = "
    SELECT ba.*
    FROM barbearias ba
    JOIN barbeiros b ON b.barbeariaId = ba.barbeariaId
    WHERE b.userId = ?
      AND b.souDono = TRUE
    LIMIT 1
";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    echo json_encode([
        "status"    => "success",
        "barbearia" => $result->fetch_assoc()
    ]);
} else {
    echo json_encode(["status" => "empty", "message" => "Nenhuma barbearia cadastrada"]);
}