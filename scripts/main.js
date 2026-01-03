import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

// URL DE NGROK (Verificada)
const SERVER_URL = "https://uncreosoted-hardly-monique.ngrok-free.dev";

const RAYCAST_OPTIONS = {
    maxDistance: 10,
    includeLiquidBlocks: false,
    includePassableBlocks: false
};

system.runInterval(() => {
    const players = world.getAllPlayers();
    if (players.length === 0) return;

    const dataToSend = [];

    for (const player of players) {
        let isUnderground = false;
        try {
            const headLoc = player.getHeadLocation();
            const hit = player.dimension.getBlockFromRay(headLoc, { x: 0, y: 1, z: 0 }, RAYCAST_OPTIONS);
            if (hit) isUnderground = true;
        } catch (e) { }

        // ENVIAR SIEMPRE (Para que detecte al Bot)
        dataToSend.push({
            name: player.name,
            x: parseFloat(player.location.x.toFixed(2)),
            y: parseFloat(player.location.y.toFixed(2)),
            z: parseFloat(player.location.z.toFixed(2)),
            dimension: player.dimension.id,
            is_underground: isUnderground
        });

        // Debug en pantalla
        const x = Math.round(player.location.x);
        const y = Math.round(player.location.y);
        const z = Math.round(player.location.z);
        player.onScreenDisplay.setActionBar(`§a📡 Conectado | Pos: ${x}, ${y}, ${z}`);
    }

    if (dataToSend.length > 0) {
        const req = new HttpRequest(SERVER_URL + "/api/positions");
        req.method = HttpRequestMethod.Post;
        req.headers = [new HttpHeader("Content-Type", "application/json")];
        req.body = JSON.stringify(dataToSend);
        http.request(req).catch((err) => {});
    }
}, 4);

// --- PRUEBA DE VIDA ---
system.runInterval(() => {
    // Esto enviará un mensaje al chat del juego cada 10 segundos
    world.sendMessage("§e[DEBUG] El Script está VIVO. URL: " + SERVER_URL);
}, 200);