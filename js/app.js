const players = ["Suárez", "Baghin", "Valentín", "Rocco"];
const prendas = [
    "🥤 Pagar Coca",
    "🎾 $3500 Pelotas",
    "🎾 Grip Compañero",
    "🎾 Grip MVP",
    "💧 Traer Agua",
    "🔥 -15 Prox. Partido" 
];

let counts = [0, 0, 0, 0];
let totalTroncos = 0;
const HITO_PRENDA = 9;
const LIMITE_FINAL = 18;

// --- Configuración Ruleta ---
let currentRotation = 0;
let isSpinning = false;
const colores = ["#f97316", "#1e293b", "#3b82f6", "#16a34a", "#e11d48", "#8b5cf6"];

// ---------------- BASE DE DATOS (CONEXIÓN PHP) ----------------

async function registrarIncidenciaBD(indexJugador, idTipo) {
    const idJugador = indexJugador + 1; 
    
    try {
        const response = await fetch('guardar_falta.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `id_jugador=${idJugador}&id_tipo=${idTipo}`
        });
        
        const res = await response.json();
        
        if (res.status === 'success') {
            console.log("✅ Datos sincronizados con MySQL");
            actualizarRankingHistorico(); 
        } else {
            console.error("❌ Error del servidor:", res.message);
        }
    } catch (e) { 
        console.error("⚠️ Error de conexión con PHP:", e); 
    }
}

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
    } catch (e) { 
        console.log("⏳ Esperando respuesta de la base de datos local..."); 
    }
}

async function registrarInasistencia(index) {
    if(confirm(`¿Confirmar inasistencia de ${players[index]}?`)) {
        await registrarIncidenciaBD(index, 2); 
    }
}

// ---------------- LÓGICA DE JUEGO (LOCALSTORAGE) ----------------

function cargarDatos() {
    const data = JSON.parse(localStorage.getItem("ruletaData"));
    if (data) {
        counts = data.counts;
        totalTroncos = data.total;
    }
    actualizarUI();
    dibujarRuleta();
    actualizarRankingHistorico();
}

function guardarDatos() {
    localStorage.setItem("ruletaData", JSON.stringify({ counts, total: totalTroncos }));
}

// ---------------- MODAL Y SUMAR TRONCO ----------------

document.getElementById("troncoBtn").addEventListener("click", () => {
    document.getElementById("modal").classList.remove("hidden");
});

function cerrarModal() {
    document.getElementById("modal").classList.add("hidden");
}

function sumarTronco(index) {
    if (totalTroncos >= LIMITE_FINAL) {
        alert("¡Límite de 18 alcanzado! Alguien tiene que pagar.");
        cerrarModal();
        return;
    }

    counts[index]++;
    totalTroncos++;

    document.getElementById("resultado").innerText = "🔥 Tronco para " + players[index];
    
    registrarIncidenciaBD(index, 1); 

    cerrarModal();
    actualizarUI();
    guardarDatos();
}

// ---------------- ACTUALIZAR INTERFAZ (UI) ----------------

function actualizarUI() {
    const maxTroncos = Math.max(...counts);
    const indiceLider = counts.indexOf(maxTroncos);

    counts.forEach((c, i) => {
        const cellCount = document.getElementById("c" + i);
        if (cellCount) cellCount.innerText = c;

        const cellEstado = document.getElementById("e" + i);
        if (cellEstado) {
            if (c === 0) {
                cellEstado.innerHTML = `<span class="text-slate-500 text-xs">Todo tranquilo 😐</span>`;
            } else if (i === indiceLider && totalTroncos > 0) {
                cellEstado.innerHTML = `<span class="text-white font-black bg-orange-600 px-2 py-1 rounded animate-pulse">EL TRONCAZO 💀</span>`;
            } else if (c >= 6) {
                cellEstado.innerHTML = `<span class="text-red-600 font-black uppercase italic">¡AL HORNO! 🔥</span>`;
            } else {
                cellEstado.innerHTML = `<span class="text-blue-400 font-medium">En la mira 👀</span>`;
            }
        }
    });

    document.getElementById("total").innerHTML = `${totalTroncos} <span class="text-slate-600 text-xl">/ ${LIMITE_FINAL}</span>`;

    const alerta = document.getElementById("alerta");
    const prendaBox = document.getElementById("prendaBox");

    if (totalTroncos > 0) {
        prendaBox.classList.remove("hidden"); 
        
        if (maxTroncos >= HITO_PRENDA) {
            alerta.innerHTML = `<span class="text-white font-bold bg-red-600 px-2 rounded">🚨 ${players[indiceLider].toUpperCase()} LLEGÓ A 9: ¡TIRÁ YA!</span>`;
        } else {
            alerta.innerHTML = `<span class="text-orange-400 font-bold">⚠️ El candidato es ${players[indiceLider]} con ${maxTroncos} troncos.</span>`;
        }
    } else {
        alerta.innerText = "A jugar...";
        prendaBox.classList.add("hidden"); 
    }

    if (totalTroncos >= LIMITE_FINAL) {
        alerta.innerHTML = `<span class="text-white font-black text-lg animate-bounce">💀 ¡FIN DE LA FECHA!</span>`;
    }
}

// ---------------- RULETA Y ANIMACIÓN ----------------

function dibujarRuleta() {
    const canvas = document.getElementById("canvasRuleta");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const centro = canvas.width / 2;
    const radio = centro - 10;
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
        ctx.strokeStyle = "#ffffff33";
        ctx.stroke();

        ctx.save();
        ctx.translate(centro, centro);
        ctx.rotate(anguloInicio + anguloPaso / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        ctx.font = "bold 11px Arial";

        const palabras = prenda.split(" ");
        if (palabras.length > 2) {
            const linea1 = palabras.slice(0, 2).join(" ");
            const linea2 = palabras.slice(2).join(" ");
            ctx.fillText(linea1, radio - 10, -5);
            ctx.fillText(linea2, radio - 10, 8);
        } else {
            ctx.fillText(prenda, radio - 10, 4);
        }
        
        ctx.restore();
    });
}

document.getElementById("prendaBtn").addEventListener("click", () => {
    if (isSpinning) return;
    
    const maxTroncos = Math.max(...counts);
    const indiceLider = counts.indexOf(maxTroncos);
    
    document.getElementById("prendaResultado").innerText = `🎯 El destino de ${players[indiceLider]} está girando...`;
    
    isSpinning = true;
    const rotacionFinal = (7 + Math.random() * 5) * 2 * Math.PI;
    const inicio = performance.now();
    const rotacionInicial = currentRotation;

    function animar(ahora) {
        const progreso = (ahora - inicio) / 4000;
        if (progreso < 1) {
            const easeOut = 1 - Math.pow(1 - progreso, 4);
            currentRotation = rotacionInicial + (easeOut * rotacionFinal);
            dibujarRuleta();
            requestAnimationFrame(animar);
        } else {
            isSpinning = false;
            
            // --- LÓGICA DEFINITIVA PARA FLECHA ABAJO (90°) ---
            const n = prendas.length;
            const anguloFinal = currentRotation % (2 * Math.PI);
            const posicionFlecha = Math.PI / 2; // La flecha está abajo
            
            // Calculamos qué sector está en la flecha
            let anguloRelativo = (posicionFlecha - anguloFinal + (2 * Math.PI)) % (2 * Math.PI);
            const anguloSector = (2 * Math.PI) / n;
            let indice = Math.floor(anguloRelativo / anguloSector);

            // Ajuste final de rango
            if (indice < 0) indice = 0;
            if (indice >= n) indice = n - 1;

            document.getElementById("prendaResultado").innerHTML = `
                <div class="bg-slate-100 text-slate-900 p-3 rounded-xl mt-4 border-l-8 border-red-600 shadow-2xl">
                    <p class="text-sm uppercase font-bold text-slate-500">SENTENCIA PARA ${players[indiceLider].toUpperCase()}:</p>
                    <p class="text-2xl font-black text-red-600">${prendas[indice]}</p>
                </div>`;
        }
    }
    requestAnimationFrame(animar);
});

function resetear() {
    if (confirm("¿Limpiar todo el partido actual? (El histórico de la DB se mantiene)")) {
        localStorage.removeItem("ruletaData");
        location.reload();
    }
}

cargarDatos();