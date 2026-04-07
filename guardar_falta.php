<?php
require 'conexion.php';
header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['id_jugador']) && isset($data['id_tipo'])) {
    try {
        $stmt = $pdo->prepare("INSERT INTO historial_faltas (id_jugador, id_tipo) VALUES (?, ?)");
        $stmt->execute([$data['id_jugador'], $data['id_tipo']]);
        echo json_encode(['status' => 'success']);
    } catch (PDOException $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Datos incompletos']);
}
?>