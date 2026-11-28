-- Estrutura do banco projetofinal (sem dados). Crie o banco e importe este arquivo.

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agendamento_servicos` (
  `agendamentoServicoId` int(11) NOT NULL AUTO_INCREMENT,
  `agendamentoId` int(11) NOT NULL,
  `servicoId` int(11) NOT NULL,
  `nomeServicoSnapshot` varchar(100) NOT NULL,
  `precoSnapshot` decimal(10,2) NOT NULL,
  PRIMARY KEY (`agendamentoServicoId`),
  KEY `servicoId` (`servicoId`),
  KEY `idx_agendamento_servicos_agendamentoId` (`agendamentoId`),
  CONSTRAINT `agendamento_servicos_ibfk_1` FOREIGN KEY (`agendamentoId`) REFERENCES `agendamentos` (`agendamentoId`) ON DELETE CASCADE,
  CONSTRAINT `agendamento_servicos_ibfk_2` FOREIGN KEY (`servicoId`) REFERENCES `servicos` (`servicoId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agendamentos` (
  `agendamentoId` int(11) NOT NULL AUTO_INCREMENT,
  `clienteId` int(11) NOT NULL,
  `barbeiroId` int(11) NOT NULL,
  `barbeariaId` int(11) DEFAULT NULL,
  `data` date NOT NULL,
  `horaInicio` time NOT NULL,
  `horaFim` time NOT NULL,
  `valorTotal` decimal(10,2) NOT NULL,
  `status` enum('confirmado','cancelado','concluido') NOT NULL DEFAULT 'confirmado',
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`agendamentoId`),
  KEY `idx_agendamentos_barbeiro_data` (`barbeiroId`,`data`),
  KEY `idx_agendamentos_cliente` (`clienteId`),
  KEY `idx_agendamentos_barbearia_data` (`barbeariaId`,`data`),
  CONSTRAINT `agendamentos_ibfk_1` FOREIGN KEY (`clienteId`) REFERENCES `users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `agendamentos_ibfk_2` FOREIGN KEY (`barbeiroId`) REFERENCES `barbeiros` (`barbeiroId`) ON DELETE CASCADE,
  CONSTRAINT `fk_agendamentos_barbearia` FOREIGN KEY (`barbeariaId`) REFERENCES `barbearias` (`barbeariaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `avaliacoes` (
  `avaliacaoId` int(11) NOT NULL AUTO_INCREMENT,
  `agendamentoId` int(11) NOT NULL,
  `clienteId` int(11) NOT NULL,
  `barbeiroId` int(11) NOT NULL,
  `barbeariaId` int(11) NOT NULL,
  `nota` tinyint(4) NOT NULL,
  `comentario` varchar(500) DEFAULT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`avaliacaoId`),
  UNIQUE KEY `agendamentoId` (`agendamentoId`),
  KEY `clienteId` (`clienteId`),
  KEY `barbeiroId` (`barbeiroId`),
  KEY `barbeariaId` (`barbeariaId`),
  CONSTRAINT `avaliacoes_ibfk_1` FOREIGN KEY (`agendamentoId`) REFERENCES `agendamentos` (`agendamentoId`) ON DELETE CASCADE,
  CONSTRAINT `avaliacoes_ibfk_2` FOREIGN KEY (`clienteId`) REFERENCES `users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `avaliacoes_ibfk_3` FOREIGN KEY (`barbeiroId`) REFERENCES `barbeiros` (`barbeiroId`) ON DELETE CASCADE,
  CONSTRAINT `avaliacoes_ibfk_4` FOREIGN KEY (`barbeariaId`) REFERENCES `barbearias` (`barbeariaId`) ON DELETE CASCADE,
  CONSTRAINT `chk_avaliacoes_nota` CHECK (`nota` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `barbearias` (
  `barbeariaId` int(11) NOT NULL AUTO_INCREMENT,
  `criadoPorUserId` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `descricao` text DEFAULT NULL,
  `endereco` varchar(255) NOT NULL,
  `cidade` varchar(100) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  `nomeAlteradoEm` timestamp NULL DEFAULT NULL,
  `enderecoAlteradoEm` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`barbeariaId`),
  KEY `idx_barbearias_criadoPorUserId` (`criadoPorUserId`),
  CONSTRAINT `barbearias_ibfk_1` FOREIGN KEY (`criadoPorUserId`) REFERENCES `users` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `barbeiros` (
  `barbeiroId` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `barbeariaId` int(11) DEFAULT NULL,
  `souDono` tinyint(1) NOT NULL DEFAULT 0,
  `especialidade` varchar(100) DEFAULT NULL,
  `descricao` text DEFAULT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`barbeiroId`),
  KEY `idx_barbeiros_userId` (`userId`),
  KEY `idx_barbeiros_barbeariaId` (`barbeariaId`),
  CONSTRAINT `barbeiros_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE,
  CONSTRAINT `barbeiros_ibfk_2` FOREIGN KEY (`barbeariaId`) REFERENCES `barbearias` (`barbeariaId`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `bloqueios` (
  `bloqueioId` int(11) NOT NULL AUTO_INCREMENT,
  `barbeiroId` int(11) NOT NULL,
  `data` date NOT NULL,
  `horaInicio` time DEFAULT NULL,
  `horaFim` time DEFAULT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`bloqueioId`),
  KEY `idx_bloqueios_barbeiro_data` (`barbeiroId`,`data`),
  CONSTRAINT `bloqueios_ibfk_1` FOREIGN KEY (`barbeiroId`) REFERENCES `barbeiros` (`barbeiroId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `convites` (
  `conviteId` int(11) NOT NULL AUTO_INCREMENT,
  `barbeariaId` int(11) NOT NULL,
  `barbeiroId` int(11) NOT NULL,
  `status` enum('pendente','aceito','recusado') NOT NULL DEFAULT 'pendente',
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  `respondidoEm` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`conviteId`),
  UNIQUE KEY `uq_convite_pendente` (`barbeariaId`,`barbeiroId`,`status`),
  KEY `idx_convites_barbeiroId` (`barbeiroId`),
  KEY `idx_convites_status` (`status`),
  CONSTRAINT `convites_ibfk_1` FOREIGN KEY (`barbeariaId`) REFERENCES `barbearias` (`barbeariaId`) ON DELETE CASCADE,
  CONSTRAINT `convites_ibfk_2` FOREIGN KEY (`barbeiroId`) REFERENCES `barbeiros` (`barbeiroId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jornadas` (
  `jornadaId` int(11) NOT NULL AUTO_INCREMENT,
  `barbeiroId` int(11) NOT NULL,
  `diaSemana` tinyint(4) NOT NULL,
  `horaInicio` time NOT NULL,
  `horaFim` time NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`jornadaId`),
  KEY `idx_jornadas_barbeiroId` (`barbeiroId`),
  CONSTRAINT `jornadas_ibfk_1` FOREIGN KEY (`barbeiroId`) REFERENCES `barbeiros` (`barbeiroId`) ON DELETE CASCADE,
  CONSTRAINT `CONSTRAINT_1` CHECK (`diaSemana` between 0 and 6),
  CONSTRAINT `CONSTRAINT_2` CHECK (`horaFim` > `horaInicio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `servicos` (
  `servicoId` int(11) NOT NULL AUTO_INCREMENT,
  `barbeiroId` int(11) NOT NULL,
  `nome` varchar(100) NOT NULL,
  `preco` decimal(10,2) NOT NULL,
  `duracaoMin` int(11) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT 1,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`servicoId`),
  KEY `idx_servicos_barbeiroId` (`barbeiroId`),
  CONSTRAINT `servicos_ibfk_1` FOREIGN KEY (`barbeiroId`) REFERENCES `barbeiros` (`barbeiroId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessoes` (
  `sessaoId` int(11) NOT NULL AUTO_INCREMENT,
  `tokenHash` char(64) NOT NULL,
  `userId` int(11) NOT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  `expiraEm` datetime NOT NULL,
  PRIMARY KEY (`sessaoId`),
  UNIQUE KEY `tokenHash` (`tokenHash`),
  KEY `idx_sessoes_userId` (`userId`),
  CONSTRAINT `sessoes_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`userId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `userId` int(11) NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `senha` varchar(255) NOT NULL,
  `telefone` varchar(20) DEFAULT NULL,
  `fotoPerfil` varchar(255) DEFAULT NULL,
  `tipo` enum('cliente','barbeiro') NOT NULL,
  `criadoEm` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`userId`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

