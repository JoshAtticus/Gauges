function performAdjustment(data) {
    const DASH_LIGHTS = {
        SHIFT: 1 << 0,
        FULLBEAM: 1 << 1,
        HANDBRAKE: 1 << 2,
        PITSPEED: 1 << 3,
        TC: 1 << 4,
        SIGNAL_L: 1 << 5,
        SIGNAL_R: 1 << 6,
        CHECK: 1 << 7,
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
var maxBoost = 0;
var currentGear = "N";
var data2;
const socket = io();
socket.on("update", (data) => {
    data2 = performAdjustment(data);
    updateDisplays(data2);
});

genSpeedoNumbers();
genSpeedoNumbersExtra();
genSpeedoNumbersExtra_What_The_F_Bro();
genOilTempNumbers();
genFuelNumbers();
genWaterNumbers();

window.addEventListener('resize', () => {
    genSpeedoNumbers();
    genRpmNumbers();
    genBoostNumbers();
});

function updateDisplays(data2) {
    if (data2.rpmMax != maxRpm) {
        maxRpm = data2.rpmMax;
        genRpmNumbers();
        updateTickColor();
    };
    if (data2.turboMax != maxBoost) {
        maxBoost = data2.turboMax;
        genBoostNumbers();
    };
    const throttle = document.getElementById("throttleDisplay");
    const brake = document.getElementById("brakeDisplay");
    const clutch = document.getElementById("clutchDisplay");
    const handbrake = document.getElementById("handbrake");
    const oilWarn = document.getElementById("oilWarn");
    const waterWarn = document.getElementById("waterWarn");
    const fuelWarn = document.getElementById("fuelWarn");
    const signalL = document.getElementById("arrowLeft");
    const signalR = document.getElementById("arrowRight");
    const hazard = document.getElementById("hazard");
    const abs = document.getElementById("abs");
    const fullbeam = document.getElementById("fullbeam");
    const tc = document.getElementById("tc");
    const rpmArrow = document.getElementById("rpmPointer");
    const speedArrow = document.getElementById("speedPointer");
    const fuelArrow = document.getElementById("fuelPointer");
    const waterArrow = document.getElementById("waterPointer");
    const oilArrow = document.getElementById("oilPointer");
    const boostArrow = document.getElementById("boostPointer");
    const speedDisplay = document.getElementById("speedDisplay");
    const gearDisplay = document.getElementById("gearDisplay");
    const gearOverlay = document.getElementById("displayOverlay");
    const check = document.getElementById("check");
    const turboMeter = document.getElementById("turboMeter");
    const tachoBoost = document.getElementById("tachoBoost");
    

    throttle.style.background = `linear-gradient(to top, lime ${(data2.throttle * 100).toFixed(0)}%, #0e1011 ${(data2.throttle * 100).toFixed(0)}%)`
    brake.style.background = `linear-gradient(to top, red ${(data2.brake * 100).toFixed(0)}%, #0e1011 ${(data2.brake * 100).toFixed(0)}%)`
    clutch.style.background = `linear-gradient(to top, blue ${(data2.clutch * 100).toFixed(0)}%, #0e1011 ${(data2.clutch * 100).toFixed(0)}%)`
    var speed = Math.round((3.6 * data2.speed) * 10) / 10; 
    speedDisplay.textContent = (speed + 0.5) | 0;

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
    };
    gearDisplay.textContent = currentGear;

    rpmArrow.style.transform = `translate(-50%, -50%) scale(1.3) rotate(${(data2.rpm / maxRpm) * 270 - 180}deg)`;

    fuelArrow.style.transform = `rotate(${(data2.fuel / 1) * 90 - 45}deg)`;

    waterArrow.style.transform = `rotate(${(data2.engTemp / 130) * 90 - 45}deg)`;

    if (data2.oilTemp < 130) {
        oilArrow.style.transform = `rotate(${(data2.oilTemp / -130) * 90 - 0}deg)`;
    } else {
        oilArrow.style.transform = `rotate(-90deg)`;
    };

    if (speed > 250) {
        if (speed > 500) {
            speedArrow.style.transform = `translate(-50%, -50%) scale(1.3) rotate(${((speed - 500) / 19500) * 270 + 180}deg)`;
            if (speed > 20000) {speedArrow.style.transform = `translate(-50%, -50%) scale(1.3) rotate(90deg)`;}
        } else {
        speedArrow.style.transform = `translate(-50%, -50%) scale(1.3) rotate(${((speed - 250) / 250) * 90 + 90}deg)`;
        };
    } else {
        speedArrow.style.transform = `translate(-50%, -50%) scale(1.3) rotate(${(speed / 250) * 270 - 180}deg)`;
    };
    
    if (data2.flags.hasTurbo) {
        boostArrow.removeAttribute("hidden");
        turboMeter.removeAttribute("hidden");
        tachoBoost.removeAttribute("hidden");

        if (data2.turbo >= 0) {
            boostArrow.style.transform = `rotate(${(data2.turbo / maxBoost) * 180 - 90}deg)`;
        } else {
            boostArrow.style.transform = `rotate(${(data2.turbo / 1) * 90 - 90}deg)`;
        };
    } else {
        boostArrow.setAttribute("hidden", true);
        turboMeter.setAttribute("hidden", true);
        tachoBoost.setAttribute("hidden", true);
    };

    if (data2.showLights.includes("BATTERY")) {
        rpmArrow.src = "./images/arrow_off.png";
        boostArrow.src = "./images/arrow_off.png";
        speedArrow.src = "./images/arrow_off.png";
        fuelArrow.src = "./images/arrow_90_off.png";
        oilArrow.src = "./images/arrow_90_off.png";
        waterArrow.src = "./images/arrow_90_off.png";
        gearOverlay.src = "./images/overlay_on.png";
    } else {
        if (data2.showLights.includes("SHIFT")) {
            rpmArrow.src = "./images/arrow_shift.png";
        } else {
            rpmArrow.src = "./images/arrow_on.png";
        };
        
        speedArrow.src = "./images/arrow_on.png";
        boostArrow.src = "./images/arrow_shift.png";
        fuelArrow.src = "./images/arrow_90_on.png";
        oilArrow.src = "./images/arrow_90_on.png";
        waterArrow.src = "./images/arrow_90_on.png";
        gearOverlay.src = "./images/overlay_off.png";
    };

    if (data2.showLights.includes("SIGNAL_L") && !data2.showLights.includes("SIGNAL_R")) {
        signalL.src = "./images/blinker_on.png";
    }
    else {
        signalL.src = "./images/blinker_off.png";
    };

    if (data2.showLights.includes("SIGNAL_R") && !data2.showLights.includes("SIGNAL_L")) {
        signalR.src = "./images/blinker_on.png";
    }
    else {
        signalR.src = "./images/blinker_off.png";
    };

    if (data2.showLights.includes("SIGNAL_L") && data2.showLights.includes("SIGNAL_R")) {
        hazard.src = "./images/hazard_on.png";
    }
    else {
        hazard.src = "./images/hazard_off.png";
    };

    if (data2.showLights.includes("TC")) {
        tc.src = "./images/tc_on.png";
    } else {
        tc.src = "./images/tc_off.png";
    };
    
    if (data2.showLights.includes("ABS")) {
        abs.src = "./images/abs_on.png";
    } else {
        abs.src = "./images/abs_off.png";
    };
    
    if (data2.showLights.includes("LOWBEAM")) {
        fullbeam.src = "./images/fullbeam_low.png";
    } else if (data2.showLights.includes("FULLBEAM")) {
        fullbeam.src = "./images/fullbeam_on.png";
    } else {
        fullbeam.src = "./images/fullbeam_off.png";
    };
    
    if (data2.showLights.includes("HANDBRAKE")) {
        handbrake.src = "./images/handbrake_on.png";
    } else {
        handbrake.src = "./images/handbrake_off.png";
    };
    
    if (data2.showLights.includes("OILWARN")) {
        oilWarn.src = "./images/oilWarn_on.png";
    } else {
        oilWarn.src = "./images/oilWarn_off.png";
    };

    if (data2.showLights.includes("CHECK")) {
        check.src = "./images/check_on.png";
    } else {
        check.src = "./images/check_off.png";
    };

    if (data2.engTemp >= 130) {
        waterWarn.src = "./images/waterWarn_on2.png";
    } else if (data2.engTemp >= 110) {
        waterWarn.src = "./images/waterWarn_on1.png";
    } else {
        waterWarn.src = "./images/waterWarn_off.png";
    };

    if (data2.fuel <= 0.10 && !data2.showLights.includes("BATTERY")) {
        fuelWarn.src = "./images/fuel_on.png";
    } else {
        fuelWarn.src = "./images/fuel_off.png";
    };

    updateTickColor(speed);
};

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