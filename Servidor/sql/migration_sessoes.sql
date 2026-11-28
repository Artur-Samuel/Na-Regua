-- Rode uma vez no MySQL Workbench
USE projetofinal;

CREATE TABLE IF NOT EXISTS sessoes (
  sessaoId   INT AUTO_INCREMENT PRIMARY KEY,
  tokenHash  CHAR(64) NOT NULL UNIQUE,   -- SHA-256 do token (o token em si nunca fica no banco)
  userId     INT NOT NULL,
  criadoEm   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiraEm   DATETIME NOT NULL,

  FOREIGN KEY (userId) REFERENCES users(userId)
    ON DELETE CASCADE
);

CREATE INDEX idx_sessoes_userId ON sessoes(userId);
