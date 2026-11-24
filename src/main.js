(() => {
  "use strict";

  const canvas = document.getElementById("worldMap");
  const ctx = canvas.getContext("2d");
  const COLS = 48;
  const ROWS = 32;
  const TILE = 18;
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;

  const $ = (id) => document.getElementById(id);
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

  let terrain = [];
  let berries = [];
  let glooms = [];
  let tick = 0;
  let running = false;
  let timer = null;
  let spawnCount = 0;
  let selectedId = null;
  let events = [];

  function isLand(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS && terrain[y][x] !== "water";
  }

  function addEvent(message) {
    events.unshift("T" + tick + " · " + message);
    events = events.slice(0, 30);
    $("eventLog").innerHTML = events.map((event) => "<p>" + escapeHtml(event) + "</p>").join("");
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function stop() {
    running = false;
    if (timer !== null) window.clearInterval(timer);
    timer = null;
  }

  function makeWorld() {
    stop();
    tick = 0;
    spawnCount = 0;
    selectedId = null;
    glooms = [];
    events = [];

    terrain = Array.from({ length: ROWS }, (_, y) =>
      Array.from({ length: COLS }, (_, x) => {
        const noise = Math.sin(x * 0.22) + Math.cos(y * 0.27) + Math.sin((x + y) * 0.13);
        if (noise < -1.15) return "water";
        if (noise < -0.62) return "sand";
        return "grass";
      })
    );

    // Shape a coastline and an inland lake.
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (x < 3 + Math.sin(y * 0.25) * 2 || (x > 34 && y < 9 + Math.sin(x * 0.3) * 3)) {
          terrain[y][x] = "water";
        }
        if (Math.hypot(x - 28, y - 20) < 3.1) terrain[y][x] = "water";
        if (terrain[y][x] !== "water" && terrain[y][x] === "grass" && Math.random() < 0.075) {
          terrain[y][x] = "sand";
        }
      }
    }

    berries = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (terrain[y][x] === "grass" && Math.random() < 0.055) berries.push({ x, y, food: 3 });
      }
    }

    $("mapHint").textContent = "Choose a land tile for Gloom 1";
    $("helpText").textContent = "Tap any two land tiles to place the first two Glooms. Ocean and occupied tiles are invalid locations.";
    addEvent("A new wild world has formed. No creatures, buildings, or roads exist yet.");
    update();
  }

  function spawnGloom(x, y) {
    if (!isLand(x, y)) {
      addEvent("That location is ocean. Choose a land tile.");
      return false;
    }
    if (glooms.some((gloom) => gloom.x === x && gloom.y === y)) {
      addEvent("That tile is occupied. Choose another location.");
      return false;
    }

    spawnCount += 1;
    const gloom = {
      id: spawnCount,
      name: "Gloom " + spawnCount,
      x, y,
      health: 100,
      hunger: rand(8, 22),
      energy: rand(72, 95),
      speed: rand(1, 3),
      intelligence: rand(1, 5),
      strength: rand(2, 6),
      stamina: rand(65, 95),
      age: 0,
      ambition: "Explore the world",
      alive: true
    };
    glooms.push(gloom);
    selectedId = gloom.id;
    addEvent(gloom.name + " appeared on the " + terrain[y][x] + ".");

    if (spawnCount === 1) {
      $("mapHint").textContent = "Choose a land tile for Gloom 2";
    } else {
      $("mapHint").textContent = "Two Glooms are here. Start the world when ready.";
      $("helpText").textContent = "Two Glooms have spawned. Start the simulation to watch their needs and choices change with every tick.";
    }
    update();
    return true;
  }

  function randomLocations() {
    if (running || spawnCount >= 2) return;
    let attempts = 0;
    while (spawnCount < 2 && attempts < 500) {
      attempts += 1;
      const x = rand(0, COLS - 1);
      const y = rand(0, ROWS - 1);
      if (isLand(x, y) && !glooms.some((gloom) => gloom.x === x && gloom.y === y)) {
        spawnGloom(x, y);
      }
    }
  }

  function nearestBerry(gloom) {
    let nearest = null;
    let nearestDistance = Infinity;
    for (const bush of berries) {
      if (bush.food <= 0) continue;
      const distance = Math.abs(bush.x - gloom.x) + Math.abs(bush.y - gloom.y);
      if (distance < nearestDistance) {
        nearest = bush;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  function moveToward(gloom, targetX, targetY) {
    if (gloom.energy < 3) return;
    const dx = Math.sign(targetX - gloom.x);
    const dy = Math.sign(targetY - gloom.y);
    let nextX = gloom.x;
    let nextY = gloom.y;

    if (Math.random() < 0.5) {
      nextX += dx;
      if (!isLand(nextX, nextY)) nextX = gloom.x;
      if (nextX === gloom.x) {
        nextY += dy;
        if (!isLand(nextX, nextY)) nextY = gloom.y;
      }
    } else {
      nextY += dy;
      if (!isLand(nextX, nextY)) nextY = gloom.y;
      if (nextY === gloom.y) {
        nextX += dx;
        if (!isLand(nextX, nextY)) nextX = gloom.x;
      }
    }

    const occupied = glooms.some((other) =>
      other.alive && other.id !== gloom.id && other.x === nextX && other.y === nextY
    );
    if (!occupied && (nextX !== gloom.x || nextY !== gloom.y)) {
      gloom.x = nextX;
      gloom.y = nextY;
      gloom.energy = clamp(gloom.energy - 1.2);
    }
  }

  function actFor(gloom) {
    if (!gloom.alive) return;

    gloom.age += 1;
    gloom.hunger = clamp(gloom.hunger + rand(2, 4));
    gloom.energy = clamp(gloom.energy - 0.5);

    if (gloom.hunger > 58) {
      gloom.ambition = "Find food";
      const bush = nearestBerry(gloom);
      if (bush) {
        if (bush.x === gloom.x && bush.y === gloom.y) {
          bush.food -= 1;
          gloom.hunger = clamp(gloom.hunger - 34);
          gloom.energy = clamp(gloom.energy + 9);
          addEvent(gloom.name + " ate berries.");
        } else {
          moveToward(gloom, bush.x, bush.y);
        }
      } else {
        gloom.ambition = "Explore for food";
        wander(gloom);
      }
    } else if (gloom.energy < 25) {
      gloom.ambition = "Rest";
      gloom.energy = clamp(gloom.energy + 13);
      gloom.hunger = clamp(gloom.hunger + 1);
    } else {
      const nearby = glooms.find((other) =>
        other.alive && other.id !== gloom.id &&
        Math.abs(other.x - gloom.x) + Math.abs(other.y - gloom.y) <= 2
      );
      if (nearby) {
        gloom.ambition = "Meet another Gloom";
      } else {
        gloom.ambition = "Explore";
        wander(gloom);
      }
    }

    if (gloom.hunger >= 100) {
      gloom.health = clamp(gloom.health - 5);
      if (gloom.health === 0) {
        gloom.alive = false;
        addEvent(gloom.name + " died from starvation.");
      }
    }
  }

  function wander(gloom) {
    if (gloom.energy < 3) return;
    const nextX = gloom.x + rand(-1, 1);
    const nextY = gloom.y + rand(-1, 1);
    const occupied = glooms.some((other) =>
      other.alive && other.id !== gloom.id && other.x === nextX && other.y === nextY
    );
    if (isLand(nextX, nextY) && !occupied) {
      gloom.x = nextX;
      gloom.y = nextY;
      gloom.energy = clamp(gloom.energy - 1);
    }
  }

  function doTick() {
    tick += 1;
    for (const gloom of glooms) actFor(gloom);

    // Berry bushes slowly regrow, but do not create unlimited food instantly.
    if (tick % 12 === 0) {
      for (const bush of berries) {
        if (bush.food < 3 && Math.random() < 0.35) bush.food += 1;
      }
    }
    update();
  }

  function drawWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const type = terrain[y][x];
        ctx.fillStyle = type === "water" ? "#39758a" : type === "sand" ? "#bca56f" : "#638a56";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeStyle = "rgba(15,30,19,.13)";
        ctx.strokeRect(x * TILE, y * TILE, TILE, TILE);
        if (type === "grass" && (x * 13 + y * 7) % 17 === 0) {
          ctx.fillStyle = "#88a96d";
          ctx.fillRect(x * TILE + 5, y * TILE + 5, 2, 2);
        }
      }
    }

    for (const bush of berries) {
      if (bush.food <= 0) continue;
      ctx.fillStyle = "#d16b86";
      ctx.beginPath();
      ctx.arc(bush.x * TILE + 9, bush.y * TILE + 9, 4 + bush.food * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#385e3c";
      ctx.fillRect(bush.x * TILE + 8, bush.y * TILE + 3, 2, 4);
    }

    for (const gloom of glooms) {
      if (!gloom.alive) continue;
      const centerX = gloom.x * TILE + 9;
      const centerY = gloom.y * TILE + 9;
      ctx.fillStyle = gloom.id === selectedId ? "#f5d58b" : "#e8eadc";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#26372a";
      ctx.fillRect(centerX - 3, centerY - 1, 2, 2);
      ctx.fillRect(centerX + 2, centerY - 1, 2, 2);
      if (gloom.id === selectedId) {
        ctx.strokeStyle = "#fff2c7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function renderStats(gloom) {
    const stats = [
      ["Health", gloom.health, ""],
      ["Hunger", gloom.hunger, ""],
      ["Energy", gloom.energy, ""],
      ["Stamina", gloom.stamina, ""],
      ["Speed", gloom.speed * 20, "%"],
      ["Intelligence", gloom.intelligence * 20, "%"],
      ["Strength", gloom.strength * 10, "%"]
    ];
    $("selectedStats").innerHTML = stats.map(([name, value, suffix]) => {
      const display = Math.round(value);
      return '<div class="meter"><div class="meter-head"><span>' + name +
        '</span><b>' + display + suffix + '</b></div><div class="track"><div class="fill" style="width:' +
        clamp(value) + '%"></div></div></div>';
    }).join("");
  }

  function update() {
    drawWorld();
    const living = glooms.filter((gloom) => gloom.alive);
    $("tickCount").textContent = "TICK " + tick;
    $("tickSide").textContent = String(tick);
    $("population").textContent = living.length + " GLOOMS";
    $("populationBig").textContent = String(living.length);
    $("berryCount").textContent = String(berries.reduce((total, bush) => total + bush.food, 0));
    $("startBtn").textContent = running ? "Pause world" : "Start world";
    $("startBtn").disabled = spawnCount < 2;
    $("stepBtn").disabled = running || spawnCount < 2;
    $("randomBtn").disabled = running || spawnCount >= 2;
    $("liveDot").parentElement.classList.toggle("running", running);
    $("runState").textContent = running ? "WORLD RUNNING" : "WORLD PAUSED";

    const selected = glooms.find((gloom) => gloom.id === selectedId && gloom.alive);
    $("selectedName").textContent = selected ? selected.name : "No Gloom selected";
    $("selectedDetails").textContent = selected
      ? "Age " + selected.age + " ticks · " + selected.ambition
      : "Choose a Gloom on the map to inspect its needs and ambition.";
    if (selected) renderStats(selected);
    else $("selectedStats").innerHTML = "";
  }

  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * COLS);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * ROWS);

    if (spawnCount < 2 && !running) {
      spawnGloom(x, y);
      return;
    }
    const clicked = glooms.find((gloom) => gloom.alive && gloom.x === x && gloom.y === y);
    if (clicked) {
      selectedId = clicked.id;
      update();
    }
  });

  $("randomBtn").addEventListener("click", randomLocations);
  $("stepBtn").addEventListener("click", doTick);
  $("startBtn").addEventListener("click", () => {
    if (spawnCount < 2) return;
    if (running) {
      stop();
      update();
    } else {
      running = true;
      update();
      timer = window.setInterval(doTick, 550);
    }
  });
  $("resetBtn").addEventListener("click", makeWorld);

  makeWorld();
})();