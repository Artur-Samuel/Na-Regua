CREATE DATABASE projetofinal;
USE projetofinal;

CREATE TABLE users (
  userId      INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  senha       VARCHAR(255) NOT NULL,
  telefone    VARCHAR(20),
  fotoPerfil  VARCHAR(255),
  tipo        ENUM('cliente','barbeiro') NOT NULL,
  criadoEm    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE barbeiros (
  barbeiroId    INT AUTO_INCREMENT PRIMARY KEY,
  userId        INT NOT NULL,
  especialidade VARCHAR(100),
  descricao     TEXT,
  criadoEm      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES users(userId)
    ON DELETE CASCADE
);
SELECT u.userId, u.nome, u.tipo, b.barbeiroId
FROM users u
LEFT JOIN barbeiros b ON b.userId = u.userId;

CREATE INDEX idx_barbeiros_userId ON barbeiros(userId);

-- ─────────────────────────────────────────────────────────────────────
-- barbearias
-- Ponto 6: UNIQUE em barbeiroId — 1 barbeiro = 1 barbearia
--   ⚠️ Confirme que essa é mesmo a regra de negócio antes de usar.
--   Se no futuro um barbeiro puder ter várias unidades/rede,
--   remova essa constraint.
-- Ponto 9: índice em barbeiroId (a UNIQUE já cria um automaticamente,
--   então não precisamos de um CREATE INDEX redundante aqui)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE barbearias (
  barbeariaId INT AUTO_INCREMENT PRIMARY KEY,
  barbeiroId  INT NOT NULL UNIQUE,

  nome        VARCHAR(100) NOT NULL,
  descricao   TEXT,
  endereco    VARCHAR(255) NOT NULL,
  cidade      VARCHAR(100) NOT NULL,

  latitude    DECIMAL(10,8),
  longitude   DECIMAL(11,8),

  telefone    VARCHAR(20),
  foto        VARCHAR(255),

  criadoEm    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (barbeiroId) REFERENCES barbeiros(barbeiroId)
    ON DELETE CASCADE
);

-- =====================================================================
-- Notas:
-- • nome/endereco/cidade em barbearias também viraram NOT NULL —
--   é consistente com o ponto 7 (a tela create-barbershop.tsx já
--   exige esses 3 campos no frontend, então o banco não deveria
--   aceitar menos do que isso).
-- • create_barbershop.php precisa validar e tratar o erro de duplicata:
--   se um barbeiro tentar criar uma 2ª barbearia, o INSERT vai falhar
--   por causa do UNIQUE em barbeiroId. Trate esse erro no PHP com uma
--   mensagem amigável em vez de deixar estourar erro do MySQL.
-- =====================================================================
