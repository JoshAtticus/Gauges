const fs = require('node:fs');
const path = require('node:path');
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const dgram = require('node:dgram');
const server = dgram.createSocket('udp4');
let serverLoaded = false;

// Load configuration
const configPath = path.join(__dirname, 'config.cfg');
const configData = fs.readFileSync(configPath, 'utf8');
const config = Object.fromEntries(
  configData.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=').map(part => part.trim()))
);

const { host, outGaugePort, dashboardPort} = config;

data = {}
const OG_KM = 16384; // if not set, user prefers MILES
const OG_BAR = 32768; // if not set, user prefers PSI
const OG_TURBO = 8192; // show turbo gauge

const DL_SHIFT = 1 << 0;
const DL_FULLBEAM = 1 << 1;
const DL_HANDBRAKE = 1 << 2;
const DL_OILWARN = 1 << 8;
const DL_BATTERY = 1 << 9;
const DL_ABS = 1 << 10;

const parseFlags = (flags) => ({
    km: (flags & OG_KM) !== 0,
    bar: (flags & OG_BAR) !== 0,
    turbo: (flags & OG_TURBO) !== 0,
});

const parseDashLights = (dashLights) => ({
    shiftLight: (dashLights & DL_SHIFT) !== 0,
    fullBeam: (dashLights & DL_FULLBEAM) !== 0,
    handbrake: (dashLights & DL_HANDBRAKE) !== 0,
    oilWarning: (dashLights & DL_OILWARN) !== 0,
    batteryWarning: (dashLights & DL_BATTERY) !== 0,
    absActive: (dashLights & DL_ABS) !== 0,
});

server.on('message', (msg, rinfo) => {

    const view = new DataView(msg.buffer);

    const gearBytes = new Uint8Array(msg.buffer.slice(2, 6));  
    const gear = new TextDecoder().decode(gearBytes).replace(/\0/g, '');

    const data = {
        flags: view.getUint16(0, true),   // 2 bytes
        gear: gear,                       // 4 bytes (char[4])
        plid: view.getUint8(6),           // 1 byte
        speed: view.getFloat32(8, true),  // 4 bytes
        rpm: view.getFloat32(12, true),   // 4 bytes
        rpmMax: view.getFloat32(16, true),// 4 bytes
        turbo: view.getFloat32(20, true), // 4 bytes
        turboMax: view.getFloat32(24, true), // 4 bytes
        engTemp: view.getFloat32(28, true), // 4 bytes
        fuel: view.getFloat32(32, true),   // 4 bytes
        oilPressure: view.getFloat32(36, true), // 4 bytes
        oilTemp: view.getFloat32(40, true),    // 4 bytes
        dashLights: view.getUint32(44, true),  // 4 bytes
        showLights: view.getUint32(48, true),  // 4 bytes
        throttle: view.getFloat32(52, true),   // 4 bytes
        brake: view.getFloat32(56, true),      // 4 bytes
        clutch: view.getFloat32(60, true),     // 4 bytes
    };

    const flags = parseFlags(data.flags);
    const dashLights = parseDashLights(data.dashLights);
    const showLights = parseDashLights(data.showLights);

    io.emit("update", data);
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
    serverLoaded = true;
});

process.on('uncaughtException', (error) => {
    console.error("Error:", error);
});

// Initialize Express & HTTP Server
const app = express();
const serverhttp = http.createServer(app);
const io = new Server(serverhttp);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Serve HTML
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the dashboard site
serverhttp.listen(dashboardPort, () => {
    console.log(`Dashboard running at \x1b[0;94mhttp://${host}:${dashboardPort}\x1b[0m (ctrl+click to open in browser)`);
});

server.bind(outGaugePort);