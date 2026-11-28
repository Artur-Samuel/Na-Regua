-- Rode uma vez no MySQL (phpMyAdmin → aba SQL)
USE projetofinal;

CREATE TABLE IF NOT EXISTS avaliacoes (
  avaliacaoId    INT AUTO_INCREMENT PRIMARY KEY,
  agendamentoId  INT NOT NULL UNIQUE,          -- 1 avaliação por agendamento
  clienteId      INT NOT NULL,
  barbeiroId     INT NOT NULL,                 -- guardado já pensando no relatório por barbeiro
  barbeariaId    INT NOT NULL,                 -- foto de onde o barbeiro trabalhava no atendimento
  nota           TINYINT NOT NULL,
  comentario     VARCHAR(500) NULL,
  criadoEm       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT chk_avaliacoes_nota CHECK (nota BETWEEN 1 AND 5),
  FOREIGN KEY (agendamentoId) REFERENCES agendamentos(agendamentoId) ON DELETE CASCADE,
  FOREIGN KEY (clienteId)     REFERENCES users(userId)              ON DELETE CASCADE,
  FOREIGN KEY (barbeiroId)    REFERENCES barbeiros(barbeiroId)      ON DELETE CASCADE,
  FOREIGN KEY (barbeariaId)   REFERENCES barbearias(barbeariaId)    ON DELETE CASCADE
);

CREATE INDEX idx_avaliacoes_barbearia ON avaliacoes(barbeariaId, criadoEm);
CREATE INDEX idx_avaliacoes_barbeiro  ON avaliacoes(barbeiroId);

-- A avaliação não pode ser alterada nem apagada por ninguém pelo app.
-- Estes gatilhos bloqueiam isso também direto no banco (exceto o CASCADE de
-- quando o agendamento/usuário é excluído, que não passa por gatilho).
DELIMITER $$
CREATE TRIGGER trg_avaliacoes_sem_update BEFORE UPDATE ON avaliacoes
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Avaliações não podem ser alteradas';
END$$
DELIMITER ;
