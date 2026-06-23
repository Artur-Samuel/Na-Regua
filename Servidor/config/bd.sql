CREATE DATABASE projetofinal;
USE projetofinal;

CREATE TABLE users (
  userId INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100),
  email VARCHAR(100),
  senha VARCHAR(255),
  telefone VARCHAR(20),
  fotoPerfil VARCHAR(255),
  tipo ENUM('cliente','barbeiro'),
  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
select*from users;

CREATE TABLE barbeiros (
  barbeiroId INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,

  especialidade VARCHAR(100),
  descricao TEXT,

  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES users(userId)
    ON DELETE CASCADE
);
select*from barbeiros;

CREATE TABLE barbearias (
  barbeariaId INT AUTO_INCREMENT PRIMARY KEY,
  barbeiroId INT NOT NULL,

  nome VARCHAR(100),
  descricao TEXT,
  endereco VARCHAR(255),
  cidade VARCHAR(100),

  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),

  telefone VARCHAR(20),
  foto VARCHAR(255),

  criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (barbeiroId) REFERENCES barbeiros(barbeiroId)
    ON DELETE CASCADE
);
select*from barbearias;
