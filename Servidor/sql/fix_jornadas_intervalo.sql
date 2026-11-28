-- Rode uma vez no MySQL (phpMyAdmin → aba SQL)
-- Corrige jornadas salvas no formato antigo, em que o "intervalo" foi gravado como
-- uma faixa DENTRO do expediente (ex.: 09–18 + 13–14). Vira 09–13 + 14–18.
USE projetofinal;

CREATE TEMPORARY TABLE fix_jornadas AS
SELECT a.jornadaId AS expedienteId, b.jornadaId AS pausaId,
       a.horaFim AS fimExpediente, b.horaInicio AS inicioPausa, b.horaFim AS fimPausa
FROM jornadas a
JOIN jornadas b
  ON b.barbeiroId = a.barbeiroId
 AND b.diaSemana  = a.diaSemana
 AND b.jornadaId <> a.jornadaId
 AND b.horaInicio > a.horaInicio
 AND b.horaFim    < a.horaFim;

-- Manhã: início do expediente → início da pausa
UPDATE jornadas j JOIN fix_jornadas f ON j.jornadaId = f.expedienteId
SET j.horaFim = f.inicioPausa;

-- Tarde: fim da pausa → fim do expediente
UPDATE jornadas j JOIN fix_jornadas f ON j.jornadaId = f.pausaId
SET j.horaInicio = f.fimPausa, j.horaFim = f.fimExpediente;

DROP TEMPORARY TABLE fix_jornadas;
