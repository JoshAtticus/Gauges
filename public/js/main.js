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
socket.on("update", (data) => {
    data2 = performAdjustment(data);
    updateDisplays(data2);
});

function updateDisplays(data2) {
    if (data2.rpmMax != maxRpm) {
        maxRpm = data2.rpmMax;
        genRpmNumbers();
    }
    if (data2.turboMax != maxBoost) {
        maxBoost = data2.turboMax;
        genBoostNumbers();
    }

    // Update speed display and gauge
    var speed = Math.round((3.6 * data2.speed) * 10) / 10; 
    const speedDisplay = document.getElementById("speedDisplay");
    const gearDisplay = document.getElementById("gearDisplay");
    
    speedDisplay.textContent = (speed + 0.5) | 0;

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
    gearDisplay.textContent = currentGear;

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

// Legacy compatibility functions (for any old code that might call these)
window.updateSpeedoNumbers = function() { /* deprecated */ };
window.genRpmNumbers = function() { /* deprecated */ };
window.genSpeedoNumbers = function() { /* deprecated */ };
window.genSpeedoNumbersExtra = function() { /* deprecated */ };
window.genSpeedoNumbersExtra_What_The_F_Bro = function() { /* deprecated */ };
window.genOilTempNumbers = function() { /* deprecated */ };
window.genFuelNumbers = function() { /* deprecated */ };
window.genWaterNumbers = function() { /* deprecated */ };
window.genBoostNumbers = function() { /* deprecated */ };
window.updateTickColor = function() { /* deprecated */ };

console.log("Dashboard initialized with Chart.js gauges");

function editClassProperty(selector, property, value) {
    document.querySelectorAll(selector).forEach(el => {
        el.style[property] = value; 
    });
};

const observer = new MutationObserver(() => {
    updateTickColor();
});

observer.observe(document.getElementById("tachometer"), { childList: true, subtree: true });
var spdDisplayText = document.getElementById("measurementSPEED");

function updateTickColor(speed) {
    if (!speed) speed = 0;
    if (data2.showLights?.includes("BATTERY")) {
        editClassProperty(".tick", "backgroundColor", "#000000");
        editClassProperty(".number", "color", "#000000");
        editClassProperty(".tickspd", "backgroundColor", "#000000");
        editClassProperty(".numberspd", "color", "#000000");
        editClassProperty(".numberRpm", "color", "#000000");
        editClassProperty(".tickRpm", "backgroundColor", "#000000");
        editClassProperty(".numberTurbo", "color", "#000000");
    } else {
        editClassProperty(".tick", "backgroundColor", "#FF0000");
        editClassProperty(".number", "color", "#FF0000");
        editClassProperty(".tickspd", "backgroundColor", "#FF0000");
        editClassProperty(".numberspd", "color", "#FF0000");
        editClassProperty(".numberRpm", "color", "#FF0000");
        editClassProperty(".tickRpm", "backgroundColor", "#FF0000");
        editClassProperty(".numberTurbo", "color", "#FF0000");
    };

    if (speed > 250) {
        if (speed > 500) {
            spdDisplayText.style.color = "#7700ff";
            spdDisplayText.textContent = "Mach";
            editClassProperty(".tick3", "backgroundColor", "#7700ff");
            editClassProperty(".number3", "color", "#7700ff");
            editClassProperty(".tick2", "backgroundColor", "#00000000");
            editClassProperty(".number2", "color", "#00000000");
            editClassProperty(".tickspd", "backgroundColor", "#00000000");
            editClassProperty(".numberspd", "color", "#00000000");
            if (speed > 20000) {
                spdDisplayText.textContent = "BRRR";
            };
        } else {
            spdDisplayText.style.color = "#000000";
            spdDisplayText.textContent = "kmh";
            editClassProperty("measurementSPEED", "color", "#000000");
            editClassProperty(".tick3", "backgroundColor", "#00000000");
            editClassProperty(".number3", "color", "#00000000");
            editClassProperty(".tick2", "backgroundColor", "#FF0000");
            editClassProperty(".number2", "color", "#FF0000");
        }
    } else {
        spdDisplayText.style.color = "#000000";
        spdDisplayText.textContent = "kmh";
        editClassProperty("measurementSPEED", "color", "#000000");
        editClassProperty(".tick2", "backgroundColor", "#00000000");
        editClassProperty(".number2", "color", "#00000000");
        editClassProperty(".tick3", "backgroundColor", "#00000000");
        editClassProperty(".number3", "color", "#00000000");
    };
};

function genRpmNumbers() {
    const tachometer = document.getElementById("tachometer");
    tachometer.replaceChildren();

    const width = Math.floor(Number(window.getComputedStyle(speedometer).width.slice(0, -2)));

    const radius = width / 1.95;
    const centerX = width / 2;
    const centerY = width / 2;
    const maxRPM = maxRpm;
    const step = 1000;
    const tickDistance = 10;

    const numbers = maxRPM / step + 2;
    const startAngle = -180;
    const endAngle = 90;

    for (let i = 0; i < numbers; i++) {
        let rpm = i * step;
        let angle = startAngle + (i / (numbers - 2)) * (endAngle - startAngle) - 90;
        let radians = angle * (Math.PI / 180);

        if ((Number(angle) + 270) >= 360) return;

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("numberRpm");
        numberElement.innerText = Math.floor(rpm / 1000);
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        tachometer.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick");

        const tickLength = 40;

        let tickX = centerX + (radius + tickDistance - tickLength) * Math.cos(radians);
        let tickY = centerY + (radius + tickDistance - tickLength) * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}px`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle + 180;
        tickElement.style.transformOrigin = "0% 50%";

        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        tachometer.appendChild(tickElement);
    };
};

function genSpeedoNumbers() {
    const speedometer = document.getElementById("speedometer");
    speedometer.replaceChildren();

    const width = Math.floor(Number(window.getComputedStyle(speedometer).width.slice(0, -2)));

    const radius = width / 2.25
    const centerX = width / 2;
    const centerY = width / 2;
    const max = 250;
    const tickDistance = width / 3.5;

    const startAngle = -180;
    const endAngle = 90;

    const customNumbers = [20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240];

    customNumbers.forEach(num => {
        let angle = startAngle + (num / max) * (endAngle - startAngle) - 90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("numberspd");
        numberElement.innerText = num;
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        speedometer.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tickspd");

        const tickLength = Math.floor(width) / 200;

        let tickX = centerX + tickDistance * Math.cos(radians);
        let tickY = centerY + tickDistance * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}vw`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        speedometer.appendChild(tickElement);
    });
};

function genSpeedoNumbersExtra() {
    const speedometer = document.getElementById("speedometer");

    const width = Math.floor(Number(window.getComputedStyle(speedometer).width.slice(0, -2)));

    const radius = width / 2.25
    const centerX = width / 2;
    const centerY = width / 2;
    const min = 250
    const max = 500;
    const tickDistance = width / 3.5;

    const startAngle = 90;
    const endAngle = 180;

    const customNumbers = [250, 300, 400, 500];

    customNumbers.forEach(num => {
        let angle = startAngle + ((num- min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("number2");
        numberElement.innerText = num;
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        speedometer.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick2");

        const tickLength = Math.floor(width) / 200;

        let tickX = centerX + tickDistance * Math.cos(radians);
        let tickY = centerY + tickDistance * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}vw`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        speedometer.appendChild(tickElement);
    });
};

function genSpeedoNumbersExtra_What_The_F_Bro() {
    const speedometer = document.getElementById("speedometer");
    
    const width = Math.floor(Number(window.getComputedStyle(speedometer).width.slice(0, -2)));

    const radius = width / 2.25
    const centerX = width / 2;
    const centerY = width / 2;
    const min = 500
    const max = 20000;
    const tickDistance = width / 3.5;

    const startAngle = -180;
    const endAngle = 90;

    const customNumbers = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000];

    customNumbers.forEach(num => {
        let angle = startAngle + ((num - min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("number3");
        numberElement.innerText = (num * 0.0008163).toFixed(1);
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        speedometer.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick3");

        const tickLength = Math.floor(width) / 200;

        let tickX = centerX + tickDistance * Math.cos(radians);
        let tickY = centerY + tickDistance * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}vw`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        speedometer.appendChild(tickElement);
    });
};

function genOilTempNumbers() {
    const speedometer = document.getElementById("oilTempMeter");
    
    const radius = 125;
    const centerX = 230;
    const centerY = 225;
    const min = 0;
    const max = 130; 
    const tickDistance = -5;

    const startAngle = 90;
    const endAngle = 0;

    const customNumbers = [0, 90, 130];

    customNumbers.forEach(num => {
        let angle = startAngle + ((num - min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("number");
        numberElement.innerText = num == max ? "!" : num;
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        speedometer.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick");

        const tickLength = 20;

        let tickX = centerX + (radius + tickDistance - tickLength) * Math.cos(radians);
        let tickY = centerY + (radius + tickDistance - tickLength) * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}px`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle + 180;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        speedometer.appendChild(tickElement);
    });
};

function genFuelNumbers() {
    const fuelMeter = document.getElementById("fuelMeter");
    
    const radius = 125;
    const centerX = 230;
    const centerY = 225;
    const min = 0;
    const max = 1; 
    const tickDistance = -5;

    const startAngle = -90;
    const endAngle = 0;

    const customNumbers = [0, 0.5, 1];

    customNumbers.forEach(num => {
        let angle = startAngle + ((num - min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("number");
        numberElement.innerText = num == 0 ? "E" : num == 1 ? "F" : "";
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        fuelMeter.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick");

        const tickLength = 20;

        let tickX = centerX + (radius + tickDistance - tickLength) * Math.cos(radians);
        let tickY = centerY + (radius + tickDistance - tickLength) * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}px`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle + 180;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        fuelMeter.appendChild(tickElement);
    });
};

function genWaterNumbers() {
    const waterMeter = document.getElementById("waterTempMeter");
    
    const radius = 125;
    const centerX = 230;
    const centerY = 225;
    const min = 0;
    const max = 130; 
    const tickDistance = -5;

    const startAngle = -90;
    const endAngle = 0;

    const customNumbers = [0, 90, 130];

    customNumbers.forEach(num => {
        let angle = startAngle + ((num - min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("number");
        numberElement.innerText = num == max ? "!" : num;
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        waterMeter.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick");

        const tickLength = 20;

        let tickX = centerX + (radius + tickDistance - tickLength) * Math.cos(radians);
        let tickY = centerY + (radius + tickDistance - tickLength) * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}px`;
        tickElement.style.height = '4px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle + 180;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        waterMeter.appendChild(tickElement);
    });
};

function generateBoostGaugeTicks(turboMax, positiveCount) {
    
    let positiveTicks = Array.from({ length: positiveCount }, (_, i) => 
        ((i / (positiveCount - 1)) * turboMax).toFixed(1)
    );

    return [...positiveTicks];
};

function genBoostNumbers() {
    const turboMeter = document.getElementById("turboMeter");
    turboMeter.replaceChildren();

    const width = Math.floor(Number(window.getComputedStyle(turboMeter).width.slice(0, -2)));

    const radius = width / 1.85
    const centerX = width / 2;
    const centerY = width / 2;
    const max = maxBoost.toFixed(1); 
    const tickDistance = width / 2.5;
    const min = 0;

    const startAngle = -90;
    const endAngle = 90;

    const customNumbers = generateBoostGaugeTicks(maxBoost, 5);

    customNumbers.forEach(num => {
        let angle = startAngle + ((num - min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("numberTurbo");
        numberElement.innerText = num;
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        turboMeter.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick");

        const tickLength = Math.floor(width) / 200;

        let tickX = centerX + tickDistance * Math.cos(radians);
        let tickY = centerY + tickDistance * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}vw`;
        tickElement.style.height = '2px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle + 180;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        turboMeter.appendChild(tickElement);

        genBoostNegative()
    });
};

function genBoostNegative() {
    const turboMeter = document.getElementById("turboMeter");

    const width = Math.floor(Number(window.getComputedStyle(turboMeter).width.slice(0, -2)));

    const radius = width / 1.85
    const centerX = width / 2;
    const centerY = width / 2;
    const max = 0
    const tickDistance = width / 2.5;
    const min = -1;

    const startAngle = -180;
    const endAngle = -90;

    const customNumbers = [-1, -0.2,];

    customNumbers.forEach(num => {
        let angle = startAngle + ((num - min) / (max - min)) * (endAngle - startAngle) -90;
        let radians = angle * (Math.PI / 180);

        let x = centerX + radius * Math.cos(radians);
        let y = centerY + radius * Math.sin(radians);

        let numberElement = document.createElement("div");
        numberElement.classList.add("numberTurbo");
        numberElement.innerText = num;
        numberElement.style.left = `${x}px`;
        numberElement.style.top = `${y}px`;
        turboMeter.appendChild(numberElement);

        let tickElement = document.createElement("div");
        tickElement.classList.add("tick");

        const tickLength = Math.floor(width) / 200;

        let tickX = centerX + tickDistance * Math.cos(radians);
        let tickY = centerY + tickDistance * Math.sin(radians);

        tickElement.style.position = 'absolute';
        tickElement.style.width = `${tickLength}vw`;
        tickElement.style.height = '2px';

        tickElement.style.left = `${tickX}px`;
        tickElement.style.top = `${tickY}px`;

        let angleInDegrees = angle + 180;
        tickElement.style.transformOrigin = "0% 50%";
        tickElement.style.transform = `rotate(${angleInDegrees}deg)`;

        turboMeter.appendChild(tickElement);
    });
};

function initializeDashboard() {
    genRpmNumbers();
    genSpeedoNumbers();
    genSpeedoNumbersExtra();
    genSpeedoNumbersExtra_What_The_F_Bro();
    genOilTempNumbers();
    genFuelNumbers();
    genWaterNumbers();
    genBoostNumbers();
}

document.addEventListener('DOMContentLoaded', initializeDashboard);