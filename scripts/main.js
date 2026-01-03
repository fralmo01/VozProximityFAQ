import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpRequestMethod, HttpHeader } from "@minecraft/server-net";

const SERVER_URL = "https://uncreosoted-hardly-monique.ngrok-free.dev";
const MAX_INTERACTION_RANGE = 60;
const RAYCAST_OPTIONS = {
    maxDistance: 10,
    includeLiquidBlocks: false,
    includePassableBlocks: false
};

system.runInterval(() => {
    const players = world.getAllPlayers();
    if (players.length === 0) return;

    const dataToSend = [];

    // Pre-calcular posiciones para evitar lecturas repetidas
    const playerCache = players.map(p => ({
        object: p,
        location: p.location,
        name: p.name,
        dimension: p.dimension.id
    }));

    for (let i = 0; i < playerCache.length; i++) {
        const p1 = playerCache[i];
        let hasSomeoneClose = false;
        let nearestDist = Infinity;
        let nearestName = null;

        // 1. Filtrado de "Campo de Visión" y cálculo de cercanía
        for (let j = 0; j < playerCache.length; j++) {
            if (i === j) continue; // No compararse con uno mismo

            const p2 = playerCache[j];

            // Si están en dimensiones diferentes, ignorar
            if (p1.dimension !== p2.dimension) continue;

            const dx = p1.location.x - p2.location.x;
            const dy = p1.location.y - p2.location.y;
            const dz = p1.location.z - p2.location.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestName = p2.name;
            }

            if (dist <= MAX_INTERACTION_RANGE) {
                hasSomeoneClose = true;
            }
        }

        // 2. Detectar Entorno (Cueva)
        let isUnderground = false;
        try {
            const headLoc = p1.object.getHeadLocation();
            const hit = p1.object.dimension.getBlockFromRay(headLoc, { x: 0, y: 1, z: 0 }, RAYCAST_OPTIONS);
            if (hit) {
                isUnderground = true;
            }
        } catch (e) { }

        // 3. Feedback Visual (Action Bar)
        if (hasSomeoneClose) {
            const techoStatus = isUnderground ? "SÍ" : "NO";
            p1.object.onScreenDisplay.setActionBar(
                `§a🟢 Voz Lista | Cercano: ${nearestName} (${nearestDist.toFixed(1)}m) | 🏠 Techo: ${techoStatus}`
            );

            // Añadir a la lista de envío
            dataToSend.push({
                name: p1.name,
                x: parseFloat(p1.location.x.toFixed(2)),
                y: parseFloat(p1.location.y.toFixed(2)),
                z: parseFloat(p1.location.z.toFixed(2)),
                dimension: p1.dimension,
                is_underground: isUnderground
            });

        } else {
            p1.object.onScreenDisplay.setActionBar(`§7� Sin señal (Ahorrando datos)`);
        }
    }

    if (dataToSend.length > 0) {
        const req = new HttpRequest(SERVER_URL + "/api/positions");
        req.method = HttpRequestMethod.Post;
        req.headers = [new HttpHeader("Content-Type", "application/json")];
        req.body = JSON.stringify(dataToSend);

        http.request(req).catch((err) => {
        });
    }

}, 4);