<?php
// Preenche latitude/longitude das barbearias que já existem.
// Rode UMA vez pelo terminal (não pelo navegador):
//   C:\xampp\php\php.exe "C:\xampp\htdocs\Servidor\sql\geocodificar_existentes.php"
// Por padrão processa as que estão sem coordenadas e as que ficaram com a coordenada
// fixa de São Paulo que o app mandava antes. Use --todas para recalcular todas.

if (php_sapi_name() !== "cli") { http_response_code(404); exit; }

require __DIR__ . "/../config/database.php";
require __DIR__ . "/../config/geocode.php";

$todas = in_array("--todas", $argv, true);
$sql   = "SELECT barbeariaId, nome, endereco, cidade FROM barbearias"
       . ($todas ? "" : " WHERE latitude IS NULL OR longitude IS NULL
                   OR (latitude = -23.55050000 AND longitude = -46.63330000)");
$rows  = $conn->query($sql)->fetch_all(MYSQLI_ASSOC);

echo count($rows) . " barbearia(s) para processar\n";
$upd = $conn->prepare("UPDATE barbearias SET latitude = ?, longitude = ? WHERE barbeariaId = ?");

foreach ($rows as $i => $b) {
    if ($i > 0) sleep(1); // limite do Nominatim: 1 req/s
    $c = geocodificar($b["endereco"], $b["cidade"]);
    if ($c) {
        $upd->bind_param("ddi", $c["latitude"], $c["longitude"], $b["barbeariaId"]);
        $upd->execute();
        printf("OK    #%d %s -> %.6f, %.6f\n", $b["barbeariaId"], $b["nome"], $c["latitude"], $c["longitude"]);
    } else {
        $nulo = null;
        $upd->bind_param("ddi", $nulo, $nulo, $b["barbeariaId"]);
        $upd->execute();
        printf("FALHA #%d %s (\"%s, %s\") — corrija o endereço em Editar barbearia\n",
            $b["barbeariaId"], $b["nome"], $b["endereco"], $b["cidade"]);
    }
}
