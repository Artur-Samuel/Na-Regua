<?php
// config/auth.php
// Autenticação por token. Todo endpoint protegido chama exigirLogin($conn)
// e passa a usar o userId que vem daqui, NUNCA o que vem na requisição.

const SESSAO_DIAS = 30;

function responderErro(int $http, string $mensagem): void {
    http_response_code($http);
    echo json_encode(["status" => "error", "message" => $mensagem]);
    exit;
}

function lerToken(): string {
    // Header customizado: o Apache do XAMPP às vezes descarta "Authorization"
    $token = $_SERVER["HTTP_X_TOKEN"] ?? "";
    return preg_match('/^[a-f0-9]{64}$/', $token) ? $token : "";
}

/** Cria uma sessão e devolve o token (só o hash fica salvo). */
function criarSessao(mysqli $conn, int $userId): string {
    $token = bin2hex(random_bytes(32));
    $hash  = hash("sha256", $token);
    $dias  = SESSAO_DIAS;

    // Aproveita para limpar sessões vencidas
    $conn->query("DELETE FROM sessoes WHERE expiraEm < NOW()");

    $stmt = $conn->prepare("
        INSERT INTO sessoes (tokenHash, userId, expiraEm)
        VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))
    ");
    $stmt->bind_param("sii", $hash, $userId, $dias);
    $stmt->execute();

    return $token;
}

/** Retorna ["userId" => int, "tipo" => "cliente"|"barbeiro"] ou encerra com 401. */
function exigirLogin(mysqli $conn, ?string $tipo = null): array {
    $token = lerToken();
    if (!$token) responderErro(401, "Sessão expirada. Faça login novamente.");

    $hash = hash("sha256", $token);
    $stmt = $conn->prepare("
        SELECT u.userId, u.tipo
        FROM sessoes s
        JOIN users u ON u.userId = s.userId
        WHERE s.tokenHash = ? AND s.expiraEm > NOW()
        LIMIT 1
    ");
    $stmt->bind_param("s", $hash);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();

    if (!$user) responderErro(401, "Sessão expirada. Faça login novamente.");
    if ($tipo && $user["tipo"] !== $tipo) responderErro(403, "Acesso não permitido para este tipo de conta");

    return ["userId" => (int) $user["userId"], "tipo" => $user["tipo"]];
}

/** Para endpoints de barbeiro: retorna o perfil de barbeiro do usuário logado. */
function exigirBarbeiro(mysqli $conn): array {
    $auth = exigirLogin($conn, "barbeiro");

    $stmt = $conn->prepare("SELECT barbeiroId, barbeariaId, souDono FROM barbeiros WHERE userId = ? LIMIT 1");
    $stmt->bind_param("i", $auth["userId"]);
    $stmt->execute();
    $b = $stmt->get_result()->fetch_assoc();

    if (!$b) responderErro(404, "Perfil de barbeiro não encontrado");

    return [
        "userId"      => $auth["userId"],
        "barbeiroId"  => (int) $b["barbeiroId"],
        "barbeariaId" => is_null($b["barbeariaId"]) ? null : (int) $b["barbeariaId"],
        "souDono"     => (bool) $b["souDono"],
    ];
}

/** Para endpoints do dono: retorna o barbeiro + barbeariaId que ele criou, ou 403. */
function exigirDono(mysqli $conn): array {
    $b = exigirBarbeiro($conn);
    if (!$b["souDono"] || !$b["barbeariaId"]) responderErro(403, "Apenas o proprietário pode fazer isso");

    $stmt = $conn->prepare("SELECT barbeariaId FROM barbearias WHERE barbeariaId = ? AND criadoPorUserId = ?");
    $stmt->bind_param("ii", $b["barbeariaId"], $b["userId"]);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) responderErro(403, "Apenas o proprietário pode fazer isso");

    return $b;
}
