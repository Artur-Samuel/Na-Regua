<?php
// config/upload.php
// Imagens chegam do app como data URI (base64). Ficam salvas em Servidor/uploads/<pasta>/
// e o banco guarda só o caminho relativo (ex.: "uploads/barbearias/3_1731850000.jpg").

const UPLOAD_MAX_BYTES = 5 * 1024 * 1024; // 5 MB depois de decodificar

/** True se o valor é uma imagem nova vinda do app (e não o caminho que já estava salvo). */
function ehImagemNova(?string $valor): bool {
    return is_string($valor) && str_starts_with($valor, "data:image/");
}

/**
 * Salva o data URI e devolve o caminho relativo, ou null se for inválido.
 * $antigo: caminho anterior, apagado do disco depois que o novo foi salvo.
 */
function salvarImagemBase64(string $dataUri, string $pasta, string $prefixo, ?string $antigo = null): ?string {
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp);base64,(.+)$#s', $dataUri, $m)) return null;

    $bytes = base64_decode($m[2], true);
    if ($bytes === false || strlen($bytes) > UPLOAD_MAX_BYTES) return null;

    // Confere o conteúdo de verdade, não só o cabeçalho que o app mandou
    $info = @getimagesizefromstring($bytes);
    $exts = [IMAGETYPE_JPEG => "jpg", IMAGETYPE_PNG => "png", IMAGETYPE_WEBP => "webp"];
    if (!$info || !isset($exts[$info[2]])) return null;

    $raiz = dirname(__DIR__); // Servidor/
    $dir  = "$raiz/uploads/$pasta";
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) return null;

    // Nome muda a cada envio para o app não mostrar a versão em cache
    $nome    = $prefixo . "_" . time() . "." . $exts[$info[2]];
    $relpath = "uploads/$pasta/$nome";
    if (file_put_contents("$raiz/$relpath", $bytes) === false) return null;

    if ($antigo && str_starts_with($antigo, "uploads/$pasta/")) {
        @unlink("$raiz/$antigo");
    }
    return $relpath;
}
