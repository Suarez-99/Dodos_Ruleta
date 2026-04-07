<?php
require 'conexion.php';
header('Content-Type: application/json');

try {
    // Usamos la vista que creamos en SQL
    $stmt = $pdo->query("SELECT * FROM vista_ranking_completo");
    $ranking = $stmt->fetchAll();
    echo json_encode($ranking);
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>