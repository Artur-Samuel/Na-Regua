<?php

$conn = new mysqli("localhost", "root", "", "projetofinal");

if ($conn->connect_error) {
    die("Erro na conexão");
}