const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const playerPositions = new Map();
const socketUserMap = new Map();

app.post('/api/positions', (req, res) => {
    const playersData = req.body;

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
    }
    res.sendStatus(200);
});
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);
    socket.on('register', (gamertag) => {
        if (gamertag) {
            socketUserMap.set(socket.id, gamertag);
            console.log(`Socket ${socket.id} registrado como ${gamertag}`);
        }
    });
    socket.on('voice', (audioData) => {
        const senderGamertag = socketUserMap.get(socket.id);
        if (!senderGamertag) return;

        const senderPos = playerPositions.get(senderGamertag);
        if (!senderPos) return;

        io.sockets.sockets.forEach((targetSocket) => {
            if (targetSocket.id === socket.id) return;

            const targetGamertag = socketUserMap.get(targetSocket.id);
            if (!targetGamertag) return;

            const targetPos = playerPositions.get(targetGamertag);
            if (!targetPos) return;

            if (senderPos.dimension !== targetPos.dimension) return;
            const distance = Math.sqrt(
                Math.pow(senderPos.x - targetPos.x, 2) +
                Math.pow(senderPos.y - targetPos.y, 2) +
                Math.pow(senderPos.z - targetPos.z, 2)
            );

            if (distance < 20) {
                targetSocket.emit('voice', {
                    audio: audioData,
                    distance: distance
                });
                // Debug Log (Opcional: reduce esto en producción si hay mucho spam)
                // console.log(`Enviando audio de ${senderGamertag} a ${targetGamertag} (Dist: ${distance.toFixed(2)}m)`);
            } else {
                // console.log(`Audio descartado por distancia: ${distance.toFixed(2)}m`);
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