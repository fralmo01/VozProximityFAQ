const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // En producción, restringe esto a tu dominio real
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- Estructuras de Datos ---
// Almacena la última posición conocida de cada jugador (desde Minecraft)
// Clave: Gamertag (string), Valor: { x, y, z, dimension }
const playerPositions = new Map();

// Vincula el socket.id con el Gamertag del usuario conectado en la web
// Clave: Socket.id, Valor: Gamertag (string)
const socketUserMap = new Map();


// --- Endpoints HTTP (Comunicación con Minecraft) ---
app.post('/api/positions', (req, res) => {
    const playersData = req.body; // Espera: [{ name: "Steve", x: 100, y: 70, z: 100, dimension: "..." }, ...]

    if (playersData && Array.isArray(playersData)) {
        playersData.forEach(player => {
            if (player.name && player.x !== undefined) {
                playerPositions.set(player.name, {
                    x: player.x,
                    y: player.y,
                    z: player.z,
                    dimension: player.dimension
                });
            }
        });
        // Opcional: Podríamos limpiar jugadores que ya no vienen en la lista, 
        // pero por seguridad mantengamos la última posición conocida.
    }
    res.sendStatus(200);
});

// --- Lógica de Sockets (Comunicación con Cliente Web) ---
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    // Evento: 'register'
    // El cliente web debe enviar su gamertag al conectarse
    socket.on('register', (gamertag) => {
        if (gamertag) {
            socketUserMap.set(socket.id, gamertag);
            console.log(`Socket ${socket.id} registrado como ${gamertag}`);
        }
    });

    // Evento: 'voice'
    // Recibe audio del cliente y lo reenvía solo a jugadores cercanos
    socket.on('voice', (audioData) => {
        const senderGamertag = socketUserMap.get(socket.id);

        // Si el usuario no se ha registrado, ignoramos
        if (!senderGamertag) return;

        const senderPos = playerPositions.get(senderGamertag);

        // Si no tenemos posición del emisor (no está en Minecraft o no ha enviado datos aún), ignoramos
        if (!senderPos) return;

        // Recorremos todos los sockets conectados para ver quién debe recibir el audio
        io.sockets.sockets.forEach((targetSocket) => {
            // No enviar a uno mismo
            if (targetSocket.id === socket.id) return;

            const targetGamertag = socketUserMap.get(targetSocket.id);

            // Si el receptor no se ha registrado, ignoramos
            if (!targetGamertag) return;

            const targetPos = playerPositions.get(targetGamertag);

            // Si no tenemos posición del receptor, ignoramos
            if (!targetPos) return;

            // Verificamos misma dimensión
            if (senderPos.dimension !== targetPos.dimension) return;

            // Calculamos distancia 3D
            const distance = Math.sqrt(
                Math.pow(senderPos.x - targetPos.x, 2) +
                Math.pow(senderPos.y - targetPos.y, 2) +
                Math.pow(senderPos.z - targetPos.z, 2)
            );

            // Si está dentro del rango (20 bloques), enviamos el audio con la distancia
            if (distance < 20) {
                targetSocket.emit('voice', {
                    audio: audioData,
                    distance: distance
                });
            }
        });
    });

    // Evento: 'disconnect'
    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
        socketUserMap.delete(socket.id);
    });
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor de Proximity Chat escuchando en el puerto ${PORT}`);
});