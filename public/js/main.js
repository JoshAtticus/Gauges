function performAdjustment(data) {
    const DASH_LIGHTS = {
        SHIFT: 1 << 0,
        FULLBEAM: 1 << 1,
        HANDBRAKE: 1 << 2,
        PITSPEED: 1 << 3,
        TC: 1 << 4,
        SIGNAL_L: 1 << 5,
        SIGNAL_R: 1 << 6,
        OILWARN: 1 << 8,
        BATTERY: 1 << 9,
        ABS: 1 << 10,
        LOWBEAM: 1 << 11
    };

    const OG_TURBO = 8192;
    const OG_KM    = 16384;
    const OG_BAR   = 32768;

    function decodeLights(value) {
        return Object.entries(DASH_LIGHTS)
            .filter(([key, bit]) => (value & bit) !== 0)
            .map(([key]) => key);
    };

    function isFlagSet(flags, flag) {
        return (flags & flag) !== 0;
    };

    data.dashLights = decodeLights(data.dashLights);
    data.showLights = decodeLights(data.showLights);
    let flags = { "kmh":false,"bar":false,"hasTurbo":false};
    flags.hasTurbo = isFlagSet(data.flags, OG_TURBO);
    flags.kmh = isFlagSet(data.flags, OG_KM);
    flags.bar = isFlagSet(data.flags, OG_BAR);

    data.flags = flags;

    return data;
}

var maxRpm = 7000;
var maxBoost = 1;
var currentGear = "N";
var data2;
const socket = io();
let speedDisplay;
let gearDisplay;

socket.on("update", (data) => {
    data2 = performAdjustment(data);
    updateDisplays(data2);
});

function updateDisplays(data2) {
    if (data2.rpmMax != maxRpm) {
        maxRpm = data2.rpmMax;
    }
    if (data2.turboMax != maxBoost) {
        maxBoost = data2.turboMax;
    }

    // Update speed display and gauge
    var speed = Math.round((3.6 * data2.speed) * 10) / 10; 
    
    if (speedDisplay) {
        speedDisplay.textContent = (speed + 0.5) | 0;
    }

    // Update Chart.js gauges if they exist
    if (window.updateSpeedGauge) {
        window.updateSpeedGauge(Math.min(speed, 240));
    }
    if (window.updateRpmGauge) {
        window.updateRpmGauge(Math.min(data2.rpm, maxRpm));
    }

    // Update gear display
    switch (data2.gear) {
        case "-1":
            currentGear = "R";
            break;
        case "0":
            currentGear = "N";
            break;
        default:
            currentGear = data2.gear;
            break;
    }
    if (gearDisplay) {
        gearDisplay.textContent = currentGear;
    }

    // Update turn signals
    const signalL = document.getElementById("arrowLeft");
    const signalR = document.getElementById("arrowRight");
    const hazard = document.getElementById("hazard");

    // Clear all signal states first
    signalL.classList.remove("active");
    signalR.classList.remove("active");
    hazard.classList.remove("active");

    if (data2.showLights.includes("SIGNAL_L") && data2.showLights.includes("SIGNAL_R")) {
        hazard.classList.add("active");
    } else if (data2.showLights.includes("SIGNAL_L")) {
        signalL.classList.add("active");
    } else if (data2.showLights.includes("SIGNAL_R")) {
        signalR.classList.add("active");
    }

    // Update warning lights
    updateWarningLight("tc", data2.showLights.includes("TC"));
    updateWarningLight("abs", data2.showLights.includes("ABS"));
    updateWarningLight("fullbeam", data2.showLights.includes("FULLBEAM") || data2.showLights.includes("LOWBEAM"));
    updateWarningLight("handbrake", data2.showLights.includes("HANDBRAKE"));

    // Handle battery/electrical failure mode
    if (data2.showLights.includes("BATTERY")) {
        document.body.classList.add("electrical-failure");
    } else {
        document.body.classList.remove("electrical-failure");
    }
}

function updateWarningLight(elementId, isActive) {
    const element = document.getElementById(elementId);
    if (element) {
        if (isActive) {
            element.classList.add("active");
        } else {
            element.classList.remove("active");
        }
    }
}

function initializeDashboard() {
    speedDisplay = document.getElementById("speedDisplay");
    gearDisplay = document.getElementById("gearDisplay");
}

document.addEventListener('DOMContentLoaded', initializeDashboard);