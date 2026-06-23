<?php

header("Content-Type: application/json");
require "../config/database.php";

$data = json_decode(file_get_contents("php://input"), true);

$email = $data["email"];
$senha = $data["senha"];

$sql = "SELECT * FROM users WHERE email = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $email);
$stmt->execute();

$result = $stmt->get_result();

if($user = $result->fetch_assoc()){

    if(password_verify($senha, $user["senha"])){

        echo json_encode([
            "status" => "success",
            "user" => [
                "id" => $user["userId"],
                "nome" => $user["nome"],
                "email" => $user["email"],
                "tipo" => $user["tipo"]
            ]
        ]);

    }else{
        echo json_encode(["status"=>"error"]);
    }

}else{
    echo json_encode(["status"=>"error"]);
}