-- Troca o endereço de TODAS as barbearias por endereços reais de Nova Iguaçu
-- e apaga as coordenadas antigas. Depois rode o geocodificar_existentes.php.
USE projetofinal;

DROP TEMPORARY TABLE IF EXISTS tmp_enderecos;
CREATE TEMPORARY TABLE tmp_enderecos (n INT PRIMARY KEY, endereco VARCHAR(255));
INSERT INTO tmp_enderecos VALUES
  (0, 'Avenida Governador Roberto Silveira, 540'),
  (1, 'Avenida Abílio Augusto Távora, 1111'),
  (2, 'Rua Marechal Floriano Peixoto, 2000'),
  (3, 'Avenida Nilo Peçanha, 100'),
  (4, 'Rua Bernardino de Melo, 1500'),
  (5, 'Rua Doutor Thibau, 50');

UPDATE barbearias b
JOIN tmp_enderecos t ON t.n = MOD(b.barbeariaId - 1, 6)
SET b.endereco = t.endereco,
    b.cidade = 'Nova Iguaçu',
    b.latitude = NULL,
    b.longitude = NULL,
    b.enderecoAlteradoEm = NULL;   -- libera a trava de 30 dias para você poder editar depois

SELECT barbeariaId, nome, endereco, cidade FROM barbearias;
