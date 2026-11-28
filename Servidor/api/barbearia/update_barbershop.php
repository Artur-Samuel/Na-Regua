<?php
header("Content-Type: application/json");
require "../../config/database.php";
require "../../config/auth.php";
require "../../config/geocode.php";
require "../../config/upload.php";

$data = json_decode(file_get_contents("php://input"), true);

$barbeariaId = intval($data["barbeariaId"] ?? 0);
$userId      = exigirLogin($conn, "barbeiro")["userId"]; // vem do token
$nome        = trim($data["nome"] ?? "");
$descricao   = trim($data["descricao"] ?? "");
$endereco    = trim($data["endereco"] ?? "");
$cidade      = trim($data["cidade"] ?? "");
$telefone    = trim($data["telefone"] ?? "");
$foto        = $data["foto"] ?? null; // data URI só quando o dono escolheu uma foto nova

if (!$barbeariaId || !$nome || !$endereco || !$cidade) {
    echo json_encode(["status" => "error", "message" => "Campos obrigatórios ausentes"]);
    exit;
}

// Garante que o usuário é o dono da barbearia
$check = $conn->prepare("
    SELECT ba.barbeariaId, ba.nome, ba.endereco, ba.cidade, ba.latitude, ba.foto, ba.nomeAlteradoEm, ba.enderecoAlteradoEm
    FROM barbearias ba
    WHERE ba.barbeariaId = ? AND ba.criadoPorUserId = ?
");
$check->bind_param("ii", $barbeariaId, $userId);
$check->execute();
$barbearia = $check->get_result()->fetch_assoc();

if (!$barbearia) {
    echo json_encode(["status" => "error", "message" => "Barbearia não encontrada"]);
    exit;
}

$agora = time();

// Verifica restrição de nome (7 dias)
$nomeAlterado = $nome !== $barbearia["nome"];
if ($nomeAlterado && $barbearia["nomeAlteradoEm"]) {
    $ultimaAlteracao = strtotime($barbearia["nomeAlteradoEm"]);
    $diasRestantes   = 7 - floor(($agora - $ultimaAlteracao) / 86400);
    if ($diasRestantes > 0) {
        echo json_encode([
            "status"  => "error",
            "message" => "O nome só pode ser alterado a cada 7 dias. Aguarde $diasRestantes dia(s).",
            "campo"   => "nome",
        ]);
        exit;
    }
}

// Verifica restrição de endereço (30 dias)
$enderecoAlterado = $endereco !== $barbearia["endereco"];
if ($enderecoAlterado && $barbearia["enderecoAlteradoEm"]) {
    $ultimaAlteracao = strtotime($barbearia["enderecoAlteradoEm"]);
    $diasRestantes   = 30 - floor(($agora - $ultimaAlteracao) / 86400);
    if ($diasRestantes > 0) {
        echo json_encode([
            "status"  => "error",
            "message" => "O endereço só pode ser alterado a cada 30 dias. Aguarde $diasRestantes dia(s).",
            "campo"   => "endereco",
        ]);
        exit;
    }
}

// Monta SET dinâmico
$setClauses = ["descricao = ?", "cidade = ?", "telefone = ?"];
$params     = [$descricao, $cidade, $telefone];
$types      = "sss";

if ($nomeAlterado) {
    $setClauses[] = "nome = ?";
    $setClauses[] = "nomeAlteradoEm = NOW()";
    $params[]     = $nome;
    $types       .= "s";
}

if ($enderecoAlterado) {
    $setClauses[] = "endereco = ?";
    $setClauses[] = "enderecoAlteradoEm = NOW()";
    $params[]     = $endereco;
    $types       .= "s";
}

// A foto vira arquivo em uploads/; o banco guarda só o caminho
if (ehImagemNova($foto)) {
    $caminho = salvarImagemBase64($foto, "barbearias", "barbearia_$barbeariaId", $barbearia["foto"]);
    if (!$caminho) {
        echo json_encode(["status" => "error", "message" => "Não foi possível salvar a foto. Tente outra imagem (JPG ou PNG, até 5 MB)."]);
        exit;
    }
    $setClauses[] = "foto = ?";
    $params[]     = $caminho;
    $types       .= "s";
}

// Recalcula as coordenadas quando o endereço/cidade mudou ou quando ainda não tem
$cidadeAlterada = $cidade !== $barbearia["cidade"];
$coords = null;
$tentouGeocode = false;
if ($enderecoAlterado || $cidadeAlterada || is_null($barbearia["latitude"])) {
    $tentouGeocode = true;
    $coords = geocodificar($endereco, $cidade);
    if ($coords) {
        $setClauses[] = "latitude = ?";
        $setClauses[] = "longitude = ?";
        $params[]     = $coords["latitude"];
        $params[]     = $coords["longitude"];
        $types       .= "dd";
    }
}

$params[] = $barbeariaId;
$types   .= "i";

$sql  = "UPDATE barbearias SET " . implode(", ", $setClauses) . " WHERE barbeariaId = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);

if ($stmt->execute()) {
    echo json_encode([
        "status" => "success",
        "aviso"  => ($tentouGeocode && !$coords)
            ? "Dados salvos, mas não encontramos esse endereço no mapa. Confira rua, número e cidade."
            : null,
    ]);
} else {
    echo json_encode(["status" => "error", "message" => "Erro ao atualizar barbearia"]);
}