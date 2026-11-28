<?php
// Apaga a sessão do token enviado. Sempre responde success.
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";

$token = lerToken();
if ($token) {
    $hash = hash("sha256", $token);
    $stmt = $conn->prepare("DELETE FROM sessoes WHERE tokenHash = ?");
    $stmt->bind_param("s", $hash);
    $stmt->execute();
}

echo json_encode(["status" => "success"]);
