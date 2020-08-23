const STATE_MENU = 0
const STATE_GAME = 1
const STATE_DEATH = 2

let gameState = {
    timeUntilStart: 0,
    state: STATE_GAME
};

let player = {
    pos: new Vec2(0, 0),
    cam: new Vec2(0, 0),
    maxVelocity: 0.005,
    reqSpeed: new Vec2(0, 0),
    speed: new Vec2(0, 0),
    movementStates: [0, 0, 0, 0],
    lastCheckpointId: 0,
    lastCheckpointPos: new Vec2(0.5, 0.1),

    solidNormal: null
};

// @ifdef DEBUG
let debugInfo = {
    fps: 0,
    frames: 0,
    lastTimeCheck: 0
};
// @endif

function init(gl, buf) {
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    let uniformLoc = s => gl.getUniformLocation(shaderProgram, s);
    ctx.programInfo = {
        program: shaderProgram,
        uTime: uniformLoc("t"),
        uRes: uniformLoc("res"),
        uPos: uniformLoc("pos"),
        uCam: uniformLoc("cam"),
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const attrPosition = gl.getAttribLocation(shaderProgram, "aPos");
    gl.vertexAttribPointer(attrPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrPosition);

    playerInitPos()
    player.cam.set(player.pos.x, player.pos.y)
    // @ifdef DEBUG
    var fpsText = document.createElement("div")
    fpsText.classList.add('debug')
    debugInfo.fpsText = fpsText
    document.querySelector("#debug_div").appendChild(fpsText);
    // @endif
}

function playerInitPos() {
    player.speed.set(0, 0)
    player.pos.set(player.lastCheckpointPos.x, player.lastCheckpointPos.y)
}

function update() {
    player.speed.mixEq(player.reqSpeed.x, player.reqSpeed.y, 0.3);
    player.pos.addEq(player.speed.x, player.speed.y);
    if (player.solidNormal != null) {
        let dot = player.solidNormal.dot(player.speed);
        if (dot < 0) {
            let offset = player.solidNormal.mul(-dot * 1.);
            player.pos.addEq(offset.x, offset.y);
        }
    }
    let speedOffset = 0;
    player.cam.mixEq(player.pos.x + player.speed.x * speedOffset, player.pos.y + player.speed.y * speedOffset, 0.1);
}

function render(gl) {
    const programInfo = ctx.programInfo;
    gl.useProgram(programInfo.program);
    gl.uniform1f(programInfo.uTime, (Date.now() - ctx.timeStart) / 1e3);
    gl.uniform2f(programInfo.uRes, ctx.canvasSize.x, ctx.canvasSize.y);
    gl.uniform2f(programInfo.uPos, player.pos.x, player.pos.y);
    gl.uniform2f(programInfo.uCam, player.cam.x, player.cam.y);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    let pixelValues = new Uint8Array(3 * 4);
    gl.readPixels(0, 0, 3, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues);
    // solid check
    if (pixelValues[0] > 1) {
        player.solidNormal = new Vec2(
            2. * pixelValues[1] / 255. - 1.,
            2. * pixelValues[2] / 255. - 1.
        );
    } else {
        player.solidNormal = null;
    }

    if (pixelValues[4] > 1) {
        playerInitPos();
    }

    let checkpointId = Math.round(pixelValues[9]);
    if (pixelValues[8] > 1 && checkpointId >= player.lastCheckpointId) {
        player.lastCheckpointPos.set(player.pos.x, player.pos.y);
        player.lastCheckpointId = checkpointId;
    }

    // @ifdef DEBUG
    debugInfo.frames++;
    let time = new Date().getTime();
    if (time - debugInfo.lastTimeCheck > 1000) {
        debugInfo.lastTimeCheck = time;
        debugInfo.fps = debugInfo.frames;
        debugInfo.frames = 0;
    }
    debugInfo.fpsText.innerHTML = `FPS: ${debugInfo.fps}`;
    // @endif
}

function onKeyEvent(event, pressed) {
    let index = [38, 40, 37, 39].indexOf(event.which);
    let ms = player.movementStates;

    ms[index] = pressed;
    const speed = player.maxVelocity;
    player.reqSpeed.set(
        ms[2] ? -speed : ms[3] ? speed : 0,
        ms[0] ? speed : ms[1] ? -speed : 0
    )
}

function onMouseMove(x, y) {
    //player.size = x / ctx.canvasSize.x;
}