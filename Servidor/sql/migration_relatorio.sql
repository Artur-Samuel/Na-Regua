-- Rode uma vez no MySQL (phpMyAdmin → aba SQL)
-- Relatório financeiro: cada agendamento passa a guardar em qual barbearia aconteceu.
-- Assim, se um barbeiro sair da equipe, o faturamento dele continua no histórico da barbearia.
USE projetofinal;

ALTER TABLE agendamentos ADD COLUMN barbeariaId INT NULL AFTER barbeiroId;

-- Agendamentos antigos: usa a barbearia atual do barbeiro (melhor informação disponível)
UPDATE agendamentos a
JOIN barbeiros b ON b.barbeiroId = a.barbeiroId
SET a.barbeariaId = b.barbeariaId
WHERE a.barbeariaId IS NULL;

ALTER TABLE agendamentos
  ADD CONSTRAINT fk_agendamentos_barbearia
  FOREIGN KEY (barbeariaId) REFERENCES barbearias(barbeariaId) ON DELETE SET NULL;

-- (o índice por barbeiroId + data já existe: idx_agendamentos_barbeiro_data)
CREATE INDEX idx_agendamentos_barbearia_data ON agendamentos(barbeariaId, data);
