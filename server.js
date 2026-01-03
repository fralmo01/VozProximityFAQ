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

// --- AQUÍ ESTABA EL PROBLEMA ---
// Agregamos middleware para archivos estáticos
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // <--- ¡ESTA LÍNEA ES LA CLAVE!

// Ruta para recibir posiciones desde Minecraft
app.post('/api/positions', (req, res) => {
    const playersData = req.body;
    if (playersData && Array.isArray(playersData)) {
        io.emit('update-positions', playersData);
    }
    res.sendStatus(200);
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);
});

// Iniciar servidor
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor Backend escuchando en el puerto ${PORT}`);
});