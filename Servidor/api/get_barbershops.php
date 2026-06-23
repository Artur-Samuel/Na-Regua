<?php

header("Content-Type: application/json");
require "../config/database.php";

$result = $conn->query("SELECT * FROM barbearias");

$barbearias = [];

while($row = $result->fetch_assoc()){
    $barbearias[] = $row;
}

echo json_encode([
    "status" => "success",
    "barbearias" => $barbearias
]);