// --- Requerimiento A: Registro ---
// Coloca esto dentro de tu función de inicio o conexión (ej. después de connectSocket)
const gamertag = "TuGamertagAqui"; // Obtén esto de tu input
socket.emit('register', gamertag);


// --- Requerimiento B: Reproductor de Audio con Volumen 3D ---
// Coloca esto donde manejes los eventos de socket
socket.on('voice', async ({ audio, distance }) => {
    // 1. Convertir datos a Blob (asumiendo que 'audio' es un ArrayBuffer o Blob)
    const audioBlob = new Blob([audio], { type: 'audio/webm;codecs=opus' }); // Ajusta el MIME type si envías otro formato
    const audioUrl = URL.createObjectURL(audioBlob);

    // 2. Crear audio temporal
    const audioEl = new Audio(audioUrl);

    // 3. Calcular volumen basado en distancia
    // Fórmula lineal: Máximo volumen en 0m, silencio en 20m
    const maxDistance = 20;
    const volume = Math.max(0, 1 - (distance / maxDistance));

    // Asignar volumen (0.0 a 1.0)
    audioEl.volume = volume;

    // 4. Reproducir
    try {
        await audioEl.play();

        // Limpieza: Revocar URL después de reproducir para liberar memoria
        audioEl.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
    } catch (err) {
        console.error("Error reproduciendo audio:", err);
    }
});
