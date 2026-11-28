# NaRégua

App de agendamento para barbearias. O cliente encontra barbearias no mapa, agenda horários e avalia o atendimento. O barbeiro (ou dono) gerencia a agenda, os serviços, a jornada, a equipe e o financeiro.

## Estrutura

| Pasta | O que tem |
|---|---|
| `App/` | App mobile em Expo / React Native (expo-router, Reanimated) |
| `Servidor/` | API em PHP + MySQL, feita para rodar no XAMPP |

## Como rodar

### 1. Servidor (XAMPP)

1. Instale o [XAMPP](https://www.apachefriends.org/) e inicie o **Apache** e o **MySQL**.
2. Coloque a pasta `Servidor` em `C:\xampp\htdocs\Servidor` (ou crie um atalho/junction apontando para ela).
3. No phpMyAdmin, crie um banco chamado `projetofinal` e importe `Servidor/sql/schema.sql`.
4. A conexão fica em `Servidor/config/database.php` (padrão do XAMPP: usuário `root`, sem senha).

### 2. App

```bash
cd App
npm install
npx expo start
```

Antes de abrir no celular, troque o IP em `App/src/services/api.ts` (`API_URL`) pelo IP do computador que está rodando o XAMPP na sua rede.
