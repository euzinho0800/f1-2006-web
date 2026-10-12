import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const car = {
    x: 400,
    y: 300,
    width: 26,
    height: 52,
    angle: 0,
    moveAngle: 0,
    speed: 0,
    maxSpeed: 14,
    acceleration: 0.18,
    braking: 0.45,
    friction: 0.04,
    turnSpeed: 0.045,
    grip: 0.15,
    gear: 1
};

const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

const skidMarks = [];

// Sistema de Áudio (Web Audio API)
let audioCtx = null;
let engineOsc = null;
let engineGain = null;

function initAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Som do motor (Oscilador de onda dente de serra para simular ronco)
    engineOsc = audioCtx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
    
    engineGain = audioCtx.createGain();
    engineGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    
    engineOsc.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
}

// Ativa o áudio no primeiro clique/tecla para cumprir regras dos navegadores
window.addEventListener('keydown', initAudio, { once: true });
window.addEventListener('click', initAudio, { once: true });

function updateAudio() {
    if (!audioCtx || !engineOsc) return;
    // Frequência do motor sobe com a velocidade e marcha
    let targetFreq = 50 + (Math.abs(car.speed) / car.maxSpeed) * 250;
    engineOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
}

// Câmera
const camera = {
    x: 0,
    y: 0,
    update(target) {
        this.x += (target.x - canvas.width / 2 - this.x) * 0.1;
        this.y += (target.y - canvas.height / 2 - this.y) * 0.1;
    }
};

function update() {
    if (keys['ArrowUp'] || keys['KeyW']) {
        car.speed += car.acceleration;
        if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
    } else if (keys['ArrowDown'] || keys['KeyS']) {
        car.speed -= car.braking;
        if (car.speed < -car.maxSpeed / 3) car.speed = -car.maxSpeed / 3;
    } else {
        if (car.speed > 0) {
            car.speed -= car.friction;
            if (car.speed < 0) car.speed = 0;
        } else if (car.speed < 0) {
            car.speed += car.friction;
            if (car.speed > 0) car.speed = 0;
        }
    }

    if (car.speed === 0) car.gear = 1;
    else car.gear = Math.min(7, Math.floor(Math.abs(car.speed) / (car.maxSpeed / 7)) + 1);

    if (Math.abs(car.speed) > 0.5) {
        const speedFactor = Math.min(Math.abs(car.speed) / car.maxSpeed, 1);
        const directionFactor = car.speed > 0 ? 1 : -1;

        if (keys['ArrowLeft'] || keys['KeyA']) car.angle -= car.turnSpeed * speedFactor * directionFactor;
        if (keys['ArrowRight'] || keys['KeyD']) car.angle += car.turnSpeed * speedFactor * directionFactor;
    }

    let angleDifference = car.angle - car.moveAngle;
    car.moveAngle += angleDifference * car.grip;

    if (Math.abs(angleDifference) > 0.15 && Math.abs(car.speed) > 5) {
        skidMarks.push({ x: car.x, y: car.y, alpha: 0.4 });
        if (skidMarks.length > 150) skidMarks.shift();
    }

    // Função matemática da pista com curvas (traçado senoidal baseado na coordenada Y)
    const trackCenterX = Math.sin(car.y / 400) * 400; 
    const distanceFromCenter = Math.abs(car.x - trackCenterX);
    
    if (distanceFromCenter > 250) {
        car.speed *= 0.94; // Fora da pista (grama) desacelera
    }

    car.x += Math.sin(car.moveAngle) * car.speed;
    car.y -= Math.cos(car.moveAngle) * car.speed;

    camera.update(car);
    updateAudio();
}

function drawTrack() {
    ctx.fillStyle = '#2e5e2e'; // Grama de fundo
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Desenha a pista com curvas usando segmentos verticais
    for (let y = -4000; y < 4000; y += 40) {
        let centerX = Math.sin(y / 400) * 400;

        // Asfalto
        ctx.fillStyle = '#222222';
        ctx.fillRect(centerX - 250, y, 500, 42);

        // Zebras nas bordas da pista
        ctx.fillStyle = (Math.floor(y / 40) % 2 === 0) ? '#ffffff' : '#cc0000';
        ctx.fillRect(centerX - 260, y, 10, 42);
        ctx.fillRect(centerX + 250, y, 10, 42);
    }

    // Marcas de pneus
    skidMarks.forEach(mark => {
        ctx.fillStyle = `rgba(0, 0, 0, ${mark.alpha})`;
        ctx.fillRect(mark.x - 2, mark.y - 2, 4, 4);
    });

    ctx.restore();
}

function drawCar() {
    ctx.save();
    ctx.translate(car.x - camera.x, car.y - camera.y);
    ctx.rotate(car.angle);

    ctx.fillStyle = '#0033cc';
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

    ctx.fillStyle = '#111111';
    ctx.fillRect(-car.width / 2 - 4, -car.height / 2, car.width + 8, 5);
    ctx.fillRect(-car.width / 2 - 2, car.height / 2 - 5, car.width + 4, 6);

    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawHUD() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(20, 20, 220, 100);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 220, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`VEL: ${Math.round(Math.abs(car.speed) * 20)} km/h`, 35, 55);
    ctx.fillText(`MARCHA: ${car.gear}`, 35, 90);
}

function gameLoop() {
    update();
    drawTrack();
    drawCar();
    drawHUD();

    requestAnimationFrame(gameLoop);
}

gameLoop();

