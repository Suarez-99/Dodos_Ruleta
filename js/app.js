const players = ["Suárez", "Baghin", "Valentín", "Rocco"];
const prendas = [
    "🥤 Pagar coca",
    "🎾 $3500 p/balas",
    "🎾 Grip p/compa",
    "💧 Traer agua",
    "🔥 Pierde 0-15",
    "🍻 Pagar birras" 
];

let counts = [0, 0, 0, 0];
let totalTroncos = 0;
const HITO_PRENDA = 9;
const LIMITE_FINAL = 18;

// --- Configuración Ruleta ---
let currentRotation = 0;
let isSpinning = false;
const colores = ["#f97316", "#1e293b", "#3b82f6", "#16a34a", "#e11d48", "#8b5cf6"];

// ---------------- BASE DE DATOS (NUEVO) ----------------

// 1. Guardar en MySQL
async function registrarIncidenciaBD(indexJugador, idTipo) {
    const idJugador = indexJugador + 1; // Suárez=1, Baghin=2, etc.
    try {
        const response = await fetch('guardar_falta.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_jugador: idJugador, id_tipo: idTipo })
        });
        const res = await response.json();
        if (res.status === 'success') {
            console.log("✅ Guardado en DB");
            actualizarRankingHistorico(); // Refrescamos la tabla de abajo
        }
    } catch (e) { console.error("Error BD:", e); }
}

// 2. Leer Ranking de MySQL
async function actualizarRankingHistorico() {
    const tbody = document.getElementById('tabla-historica');
    if (!tbody) return;

    try {
        const response = await fetch('obtener_ranking.php');
        const datos = await response.json();
        tbody.innerHTML = '';
        datos.forEach(fila => {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-800/50 transition-colors border-b border-slate-700/50">
                    <td class="px-5 py-4 font-bold text-white">${fila.Jugador}</td>
                    <td class="px-5 py-4 text-center font-black text-orange-500">${fila.Cantidad_Troncos}</td>
                    <td class="px-5 py-4 text-center font-black text-red-500">${fila.Cantidad_Inasistencias}</td>
                </tr>`;
        });
    } catch (e) { console.log("Esperando conexión..."); }
}

// 3. Registrar Inasistencia (Para usar desde consola o nuevo botón)
async function registrarInasistencia(index) {
    if(confirm(`¿Confirmar inasistencia de ${players[index]}?`)) {
        await registrarIncidenciaBD(index, 2); // Tipo 2 = Inasistencia
    }
}

// ---------------- LOAD / SAVE ----------------
function cargarDatos() {
    const data = JSON.parse(localStorage.getItem("ruletaData"));
    if (data) {
        counts = data.counts;
        totalTroncos = data.total;
        actualizarUI();
    }
    dibujarRuleta();
    actualizarRankingHistorico(); // Carga el ranking al abrir
}

function guardarDatos() {
    localStorage.setItem("ruletaData", JSON.stringify({ counts, total: totalTroncos }));
}

// ---------------- MODAL ----------------
document.getElementById("troncoBtn").addEventListener("click", () => {
    document.getElementById("modal").classList.remove("hidden");
});

function cerrarModal() {
    document.getElementById("modal").classList.add("hidden");
}

// ---------------- SUMAR TRONCO ----------------
function sumarTronco(index) {
    if (totalTroncos >= LIMITE_FINAL) {
        alert("¡Límite global de 18 alcanzado!");
        cerrarModal();
        return;
    }

    counts[index]++;
    totalTroncos++;

    document.getElementById("resultado").innerText = "🔥 Tronco para " + players[index];
    
    // --- NUEVO: GUARDAR EN DB ---
    registrarIncidenciaBD(index, 1); // Tipo 1 = Tronco

    cerrarModal();
    actualizarUI(index);
    guardarDatos();
}

// ---------------- ACTUALIZAR UI ----------------
function actualizarUI(index = null) {
    counts.forEach((c, i) => {
        const cellCount = document.getElementById("c" + i);
        if (cellCount) cellCount.innerText = c;

        const cellEstado = document.getElementById("e" + i);
        if (cellEstado) {
            if (c === 0) {
                cellEstado.innerHTML = `<span class="text-slate-500 text-xs">Todo tranquilo 😐</span>`;
            } else if (c >= HITO_PRENDA) {
                cellEstado.innerHTML = `<span class="text-white font-black bg-red-600 px-2 py-1 rounded animate-pulse">💀 RULETA</span>`;
            } else if (c >= 6) {
                cellEstado.innerHTML = `<span class="text-red-600 font-black uppercase italic">¡AL HORNO! 🔥</span>`;
            } else if (c >= 3) {
                cellEstado.innerHTML = `<span class="text-yellow-500 font-bold">Cuidate... ⚠️</span>`;
            } else {
                cellEstado.innerHTML = `<span class="text-blue-400 font-medium">En la mira 👀</span>`;
            }
        }
    });

    document.getElementById("total").innerHTML = `${totalTroncos} <span class="text-slate-600 text-xl">/ ${LIMITE_FINAL}</span>`;

    const alerta = document.getElementById("alerta");
    const faltaElement = document.getElementById("faltanNumero");
    const prendaBox = document.getElementById("prendaBox");

    const maxTroncosIndividual = Math.max(...counts);
    const alguienLlegoAlHito = counts.some(c => c >= HITO_PRENDA);

    if (!alguienLlegoAlHito) {
        const faltanParaPrenda = HITO_PRENDA - maxTroncosIndividual;
        if (faltaElement) faltaElement.innerText = faltanParaPrenda;
        alerta.innerText = index !== null ? `⚠️ Alguien está a ${faltanParaPrenda} de la ruleta.` : "A jugar...";
        prendaBox.classList.add("hidden"); 
    } 
    else {
        if (faltaElement) faltaElement.innerText = "0";
        const indiceGanador = counts.indexOf(maxTroncosIndividual);
        const nombreGanador = players[indiceGanador];
        alerta.innerHTML = `<span class="text-white font-bold">🚨 ${nombreGanador.toUpperCase()} LLEGÓ A ${maxTroncosIndividual}: ¡RULETA!</span>`;
        prendaBox.classList.remove("hidden");
    }

    if (totalTroncos >= LIMITE_FINAL) {
        alerta.innerHTML = `<span class="text-white font-black text-lg animate-bounce">💀 ¡FIN DEL JUEGO!</span>`;
    }
}

// ---------------- RULETA (CANVAS) ----------------
function dibujarRuleta() {
    const canvas = document.getElementById("canvasRuleta");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const centro = canvas.width / 2;
    const radio = canvas.width / 2 - 10;
    const anguloPaso = (2 * Math.PI) / prendas.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    prendas.forEach((prenda, i) => {
        const anguloInicio = i * anguloPaso + currentRotation;
        const anguloFin = (i + 1) * anguloPaso + currentRotation;

        ctx.beginPath();
        ctx.moveTo(centro, centro);
        ctx.arc(centro, centro, radio, anguloInicio, anguloFin);
        ctx.fillStyle = colores[i % colores.length];
        ctx.fill();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(centro, centro);
        ctx.rotate(anguloInicio + anguloPaso / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial"; // Un toque más chico para que entre bien
        ctx.fillText(prenda, radio - 15, 5);
        ctx.restore();
    });
}

document.getElementById("prendaBtn").addEventListener("click", () => {
    if (isSpinning) return;
    
    isSpinning = true;
    const vueltasExtra = 7 + Math.random() * 5; 
    const rotacionFinal = vueltasExtra * 2 * Math.PI;
    const duracion = 4000;
    const inicio = performance.now();
    const rotacionInicial = currentRotation;

    function animar(ahora) {
        const progreso = (ahora - inicio) / duracion;
        if (progreso < 1) {
            const easeOut = 1 - Math.pow(1 - progreso, 4);
            currentRotation = rotacionInicial + (easeOut * rotacionFinal);
            dibujarRuleta();
            requestAnimationFrame(animar);
        } else {
            isSpinning = false;
            const anguloFinalNormalizado = currentRotation % (2 * Math.PI);
            const desfaseVisual = Math.PI / 2; 
            let posicionSelectorRelativa = (desfaseVisual - anguloFinalNormalizado) % (2 * Math.PI);
            if (posicionSelectorRelativa < 0) posicionSelectorRelativa += (2 * Math.PI);
            const anguloPorPrenda = (2 * Math.PI) / prendas.length;
            const indiceGanador = Math.floor(posicionSelectorRelativa / anguloPorPrenda);
            document.getElementById("prendaResultado").innerText = "🎁 RESULTADO: " + prendas[indiceGanador];
        }
    }
    requestAnimationFrame(animar);
});

function resetear() {
    if (confirm("¿Limpiar todo el partido?")) {
        localStorage.removeItem("ruletaData");
        location.reload();
    }
}

cargarDatos();