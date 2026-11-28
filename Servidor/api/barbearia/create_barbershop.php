<?php
// create_barbershop.php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";
require "../../config/geocode.php";

$data = json_decode(file_get_contents("php://input"), true);

$userId    = exigirLogin($conn, "barbeiro")["userId"]; // vem do token
$nome      = trim($data["nome"] ?? "");
$descricao = trim($data["descricao"] ?? "");
$endereco  = trim($data["endereco"] ?? "");
$cidade    = trim($data["cidade"] ?? "");
$telefone  = trim($data["telefone"] ?? "");

if (!$nome || !$endereco || !$cidade) {
    echo json_encode(["status" => "error", "message" => "Campos obrigatórios ausentes"]);
    exit;
}

// 1 - Busca o barbeiroId do usuário
$stmt = $conn->prepare("SELECT barbeiroId, barbeariaId FROM barbeiros WHERE userId = ? LIMIT 1");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "Perfil de barbeiro não encontrado"]);
    exit;
}

$barbeiro   = $result->fetch_assoc();
$barbeiroId = $barbeiro["barbeiroId"];

// 2 - Garante que esse barbeiro ainda não tem barbearia
if (!is_null($barbeiro["barbeariaId"])) {
    echo json_encode(["status" => "error", "message" => "Você já está vinculado a uma barbearia"]);
    exit;
}

// 3 - Converte o endereço em coordenadas (o app não manda mais lat/lng).
//     Se não achar, cria mesmo assim — a barbearia só não aparece no mapa.
$coords    = geocodificar($endereco, $cidade);
$latitude  = $coords["latitude"]  ?? null;
$longitude = $coords["longitude"] ?? null;

// 4 - Cria a barbearia e vincula o barbeiro como dono em uma transação
$conn->begin_transaction();

try {
    $sql = "INSERT INTO barbearias (criadoPorUserId, nome, descricao, endereco, cidade, latitude, longitude, telefone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("issssdds", $userId, $nome, $descricao, $endereco, $cidade, $latitude, $longitude, $telefone);
    $stmt->execute();
    $barbeariaId = $conn->insert_id;

    // 4 - Vincula o barbeiro como dono
    $stmt2 = $conn->prepare("UPDATE barbeiros SET barbeariaId = ?, souDono = TRUE WHERE barbeiroId = ?");
    $stmt2->bind_param("ii", $barbeariaId, $barbeiroId);
    $stmt2->execute();

    $conn->commit();
    echo json_encode([
        "status"      => "success",
        "barbeariaId" => $barbeariaId,
        "noMapa"      => $coords !== null,
        "aviso"       => $coords ? null : "Não encontramos esse endereço no mapa. Confira rua, número e cidade em Editar barbearia.",
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(["status" => "error", "message" => "Erro ao criar barbearia"]);
}