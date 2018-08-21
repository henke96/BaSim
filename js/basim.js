'use strict';
const HTML_CANVAS = "basimcanvas";
const HTML_RUNNER_MOVEMENTS = "runnermovements";
const HTML_START_BUTTON = "wavestart";
const HTML_WAVE_SELECT = "waveselect";
const HTML_TICK_COUNT = "tickcount";
const HTML_DEF_LEVEL_SELECT = "deflevelselect";
window.onload = simInit;
//{ Simulation - sim
function simInit() {
	let canvas = document.getElementById(HTML_CANVAS);
	simMovementsInput = document.getElementById(HTML_RUNNER_MOVEMENTS);
	simStartStopButton = document.getElementById(HTML_START_BUTTON);
	simStartStopButton.onclick = simStartStopButtonOnClick;
	simWaveSelect = document.getElementById(HTML_WAVE_SELECT);
	simWaveSelect.onchange = simWaveSelectOnChange;
	simDefLevelSelect = document.getElementById(HTML_DEF_LEVEL_SELECT);
	simDefLevelSelect.onchange = simDefLevelSelectOnChange;
	simTickCountSpan = document.getElementById(HTML_TICK_COUNT);
	rInit(canvas, 64*12, 64*12);
	rrInit(12);
	mInit(mWAVE_1_TO_9, 64, 64);
	ruInit(5);
	simReset();
	window.onkeydown = simWindowOnKeyDown;
	canvas.onmousedown = simCanvasOnMouseDown;
	canvas.oncontextmenu = function (e) {
		e.preventDefault();
	};
}
function simReset() {
	if (simIsRunning) {
		clearInterval(simTickTimerId);
	}
	simIsRunning = false;
	simStartStopButton.innerHTML = "Start Wave";
	baInit(0, 0, "");
	plInit(-1, 0);
	simDraw();
}
function simStartStopButtonOnClick() {
	if (simIsRunning) {
		mResetMap();
		simReset();
	} else {
		let movements = simParseMovementsInput();
		if (movements === null) {
			alert("Invalid runner movements. Example: ws-s");
			return;
		}
		simIsRunning = true;
		simStartStopButton.innerHTML = "Stop Wave";
		let maxRunnersAlive = 0;
		let totalRunners = 0;
		let wave = simWaveSelect.value;
		switch(Number(wave)) {
		case 1:
			maxRunnersAlive = 2;
			totalRunners = 2;
			break;
		case 2:
			maxRunnersAlive = 2;
			totalRunners = 3;
			break;
		case 3:
			maxRunnersAlive = 2;
			totalRunners = 4;
			break;
		case 4:
			maxRunnersAlive = 3;
			totalRunners = 4;
			break;
		case 5:
			maxRunnersAlive = 4;
			totalRunners = 5;
			break;
		case 6:
			maxRunnersAlive = 4;
			totalRunners = 6;
			break;
		case 7:
		case 10:
			maxRunnersAlive = 5;
			totalRunners = 6;
			break;
		case 8:
			maxRunnersAlive = 5;
			totalRunners = 7;
			break;
		case 9:
			maxRunnersAlive = 5;
			totalRunners = 9;
			break;
		}
		baInit(maxRunnersAlive, totalRunners, movements);
		if (mCurrentMap === mWAVE10) {
			plInit(baWAVE10_DEFENDER_SPAWN_X, baWAVE10_DEFENDER_SPAWN_Y);
		} else {
			plInit(baWAVE1_DEFENDER_SPAWN_X, baWAVE1_DEFENDER_SPAWN_Y);
		}
		console.log("Wave " + wave + " started!");
		simTick();
		simTickTimerId = setInterval(simTick, 600);
	}
}
function simParseMovementsInput() {
	let movements = simMovementsInput.value.split("-");
	for (let i = 0; i < movements.length; ++i) {
		let moves = movements[i];
		for (let j = 0; j < moves.length; ++j) {
			let move = moves[j];
			if (move !== "" && move !== "s" && move !== "w" && move !== "e") {
				return null;
			}
		}
	}
	return movements;
}
function simWindowOnKeyDown(e) {
	if (simIsRunning) {
		if (e.key === "r") {
			mAddItem(new fFood(plX, plY, true));
		} else if (e.key === "w") {
			mAddItem(new fFood(plX, plY, false));
		}
	}
	if (e.key === " ") {
		simStartStopButtonOnClick();
	}
}
function simCanvasOnMouseDown(e) {
	var canvasRect = rCanvas.getBoundingClientRect();
	let xTile = Math.trunc((e.clientX - canvasRect.left) / rrTileSize);
	let yTile = Math.trunc((canvasRect.bottom - 1 - e.clientY) / rrTileSize);
	if (e.button === 0) {
		plPathfind(xTile, yTile);
	} else if (e.button === 2) {
		if (xTile === baCollectorX && yTile === baCollectorY) {
			baCollectorX = -1;
		} else {
			baCollectorX = xTile;
			baCollectorY = yTile;
		}
	}
}
function simWaveSelectOnChange(e) {
	if (simWaveSelect.value === "10") {
		mInit(mWAVE10, 64, 64);
	} else {
		mInit(mWAVE_1_TO_9, 64, 64);
	}
	simReset();
}
function simDefLevelSelectOnChange(e) {
	mResetMap();
	simReset();
	ruInit(Number(simDefLevelSelect.value));
}
function simTick() {
	baTick();
	plUpdate();
	simDraw();
}
function simDraw() {
	mDrawMap();
	baDrawDetails();
	mDrawItems();
	baDrawEntities();
	plDrawPlayer();
	mDrawGrid();
	baDrawOverlays();
	rPresent();
}
var simTickTimerId;
var simMovementsInput;
var simStartStopButton;
var simWaveSelect;
var simDefLevelSelect;
var simTickCountSpan;
var simIsRunning;
//}
//{ Player - pl
function plInit(x, y) {
	plX = x;
	plY = y;
	plPathQueuePos = 0;
	plPathQueueX = [];
	plPathQueueY = [];
	plShortestDistances = [];
	plWayPoints = [];
}
function plUpdate() {
	if (plPathQueuePos > 0) {
		plX = plPathQueueX[--plPathQueuePos];
		plY = plPathQueueY[plPathQueuePos];
		if (plPathQueuePos > 0) {
			plX = plPathQueueX[--plPathQueuePos];
			plY = plPathQueueY[plPathQueuePos];
		}
	}
}
function plDrawPlayer() {
	if (plX >= 0) {
		rSetDrawColor(240, 240, 240, 200);
		rrFill(plX, plY);
	}
}
function plPathfind(destX, destY) {
	for (let i = 0; i < mWidthTiles*mHeightTiles; ++i) {
		plShortestDistances[i] = 99999999;
		plWayPoints[i] = 0;
	}
	plWayPoints[plX + plY*mWidthTiles] = 99;
	plShortestDistances[plX + plY*mWidthTiles] = 0;
	plPathQueuePos = 0;
	let pathQueueEnd = 0;
	plPathQueueX[pathQueueEnd] = plX;
	plPathQueueY[pathQueueEnd++] = plY;
	let currentX;
	let currentY;
	let foundDestination = false;
	while (plPathQueuePos !== pathQueueEnd) {
		currentX = plPathQueueX[plPathQueuePos];
		currentY = plPathQueueY[plPathQueuePos++];
		if (currentX === destX && currentY === destY) {
			foundDestination = true;
			break;
		}
		let newDistance = plShortestDistances[currentX + currentY*mWidthTiles] + 1;
		let index = currentX - 1 + currentY*mWidthTiles;
		if (currentX > 0 && plWayPoints[index] === 0 && (mCurrentMap[index] & 19136776) === 0) {
			plPathQueueX[pathQueueEnd] = currentX - 1;
			plPathQueueY[pathQueueEnd++] = currentY;
			plWayPoints[index] = 2;
			plShortestDistances[index] = newDistance;
		}
		index = currentX + 1 + currentY*mWidthTiles;
		if (currentX < mWidthTiles - 1 && plWayPoints[index] === 0 && (mCurrentMap[index] & 19136896) === 0) {
			plPathQueueX[pathQueueEnd] = currentX + 1;
			plPathQueueY[pathQueueEnd++] = currentY;
			plWayPoints[index] = 8;
			plShortestDistances[index] = newDistance;
		}
		index = currentX + (currentY - 1)*mWidthTiles;
		if (currentY > 0 && plWayPoints[index] === 0 && (mCurrentMap[index] & 19136770) === 0) {
			plPathQueueX[pathQueueEnd] = currentX;
			plPathQueueY[pathQueueEnd++] = currentY - 1;
			plWayPoints[index] = 1;
			plShortestDistances[index] = newDistance;
		}
		index = currentX + (currentY + 1)*mWidthTiles;
		if (currentY < mHeightTiles - 1 && plWayPoints[index] === 0 && (mCurrentMap[index] & 19136800) === 0) {
			plPathQueueX[pathQueueEnd] = currentX;
			plPathQueueY[pathQueueEnd++] = currentY + 1;
			plWayPoints[index] = 4;
			plShortestDistances[index] = newDistance;
		}
		index = currentX - 1 + (currentY - 1)*mWidthTiles;
		if (currentX > 0 && currentY > 0 && plWayPoints[index] === 0 &&
		(mCurrentMap[index] & 19136782) == 0 &&
		(mCurrentMap[currentX - 1 + currentY*mWidthTiles] & 19136776) === 0 &&
		(mCurrentMap[currentX + (currentY - 1)*mWidthTiles] & 19136770) === 0) {
			plPathQueueX[pathQueueEnd] = currentX - 1;
			plPathQueueY[pathQueueEnd++] = currentY - 1;
			plWayPoints[index] = 3;
			plShortestDistances[index] = newDistance;
		}
		index = currentX + 1 + (currentY - 1)*mWidthTiles;
		if (currentX < mWidthTiles - 1 && currentY > 0 && plWayPoints[index] === 0 &&
		(mCurrentMap[index] & 19136899) == 0 &&
		(mCurrentMap[currentX + 1 + currentY*mWidthTiles] & 19136896) === 0 &&
		(mCurrentMap[currentX + (currentY - 1)*mWidthTiles] & 19136770) === 0) {
			plPathQueueX[pathQueueEnd] = currentX + 1;
			plPathQueueY[pathQueueEnd++] = currentY - 1;
			plWayPoints[index] = 9;
			plShortestDistances[index] = newDistance;
		}
		index = currentX - 1 + (currentY + 1)*mWidthTiles;
		if (currentX > 0 && currentY < mHeightTiles - 1 && plWayPoints[index] === 0 &&
		(mCurrentMap[index] & 19136824) == 0 &&
		(mCurrentMap[currentX - 1 + currentY*mWidthTiles] & 19136776) === 0 &&
		(mCurrentMap[currentX + (currentY + 1)*mWidthTiles] & 19136800) === 0) {
			plPathQueueX[pathQueueEnd] = currentX - 1;
			plPathQueueY[pathQueueEnd++] = currentY + 1;
			plWayPoints[index] = 6;
			plShortestDistances[index] = newDistance;
		}
		index = currentX + 1 + (currentY + 1)*mWidthTiles;
		if (currentX < mWidthTiles - 1 && currentY < mHeightTiles - 1 && plWayPoints[index] === 0 &&
		(mCurrentMap[index] & 19136992) == 0 &&
		(mCurrentMap[currentX + 1 + currentY*mWidthTiles] & 19136896) === 0 &&
		(mCurrentMap[currentX + (currentY + 1)*mWidthTiles] & 19136800) === 0) {
			plPathQueueX[pathQueueEnd] = currentX + 1;
			plPathQueueY[pathQueueEnd++] = currentY + 1;
			plWayPoints[index] = 12;
			plShortestDistances[index] = newDistance;
		}
	}
	if (!foundDestination) {
		let bestDistanceStart = 0x7FFFFFFF;
		let bestDistanceEnd = 0x7FFFFFFF;
		let deviation = 10;
		for (let x = destX - deviation; x <= destX + deviation; ++x) {
			for (let y = destY - deviation; y <= destY + deviation; ++y) {
				if (x >= 0 && y >= 0 && x < mWidthTiles && y < mHeightTiles) {
					let distanceStart = plShortestDistances[x + y*mWidthTiles];
					if (distanceStart < 100) {
						let dx = Math.max(destX - x);
						let dy = Math.max(destY - y);
						let distanceEnd = dx*dx + dy*dy;
						if (distanceEnd < bestDistanceEnd || (distanceEnd === bestDistanceEnd && distanceStart < bestDistanceStart)) {
							bestDistanceStart = distanceStart;
							bestDistanceEnd = distanceEnd;
							currentX = x;
							currentY = y;
							foundDestination = true;
						}
					}
				}
			}
		}
		if (!foundDestination) {
			plPathQueuePos = 0;
			return;
		}
	}
	plPathQueuePos = 0;
	while (currentX !== plX || currentY !== plY) {
		let waypoint = plWayPoints[currentX + currentY*mWidthTiles];
		plPathQueueX[plPathQueuePos] = currentX;
		plPathQueueY[plPathQueuePos++] = currentY;
		if ((waypoint & 2) !== 0) {
			++currentX;
		} else if ((waypoint & 8) !== 0) {
			--currentX;
		}
		if ((waypoint & 1) !== 0) {
			++currentY;
		} else if ((waypoint & 4) !== 0) {
			--currentY;
		}
	}
}
var plPathQueuePos;
var plShortestDistances;
var plWayPoints;
var plPathQueueX;
var plPathQueueY;
var plX;
var plY;
//}
//{ Food - f
function fFood(x, y, isGood) {
	this.x = x;
	this.y = y;
	this.isGood = isGood;
	if (this.isGood) {
		this.colorRed = 0;
		this.colorGreen = 255;
	} else {
		this.colorRed = 255;
		this.colorGreen = 0;
	}
	this.colorBlue = 0;
}
//}
//{ RunnerRNG - rng
const rngSOUTH = 0;
const rngWEST = 1;
const rngEAST = 2;
function rngRunnerRNG(forcedMovements) {
	this.forcedMovements = forcedMovements;
	this.forcedMovementsIndex = 0;
}
rngRunnerRNG.prototype.rollMovement = function() {
	if (this.forcedMovements.length > this.forcedMovementsIndex) {
		let movement = this.forcedMovements.charAt(this.forcedMovementsIndex++);
		if (movement === "s") {
			return rngSOUTH;
		}
		if (movement === "w") {
			return rngWEST;
		}
		if (movement === "e") {
			return rngEAST;
		}
	}
	let rnd = Math.floor(Math.random() * 6);
	if (rnd < 4) {
		return rngSOUTH;
	}
	if (rnd === 4) {
		return rngWEST;
	}
	return rngEAST;
}
//}
//{ Runner - ru
function ruInit(sniffDistance) {
	ruSniffDistance = sniffDistance;
}
function ruRunner(x, y, runnerRNG, id) {
	this.x = x;
	this.y = y;
	this.destinationX = x;
	this.destinationY = y;
	this.cycleTick = 1;
	this.targetState = 0;
	this.foodTarget = null;
	this.blughhhhCountdown = 0;
	this.standStillCounter = 0;
	this.despawnCountdown = -1;
	this.isDying = false;
	this.runnerRNG = runnerRNG;
	this.id = id;
}
ruRunner.prototype.tick = function() {
	if (++this.cycleTick > 10) {
		this.cycleTick = 1;
	}
	++this.standStillCounter;
	if (this.despawnCountdown !== -1) {
		if (--this.despawnCountdown === 0) {
			baRunnersToRemove.push(this);
			if (!this.isDying) {
				--baRunnersAlive;
			}
			this.print("(despawn)");
		}
	} else {
		if (!this.isDying) {
			switch(this.cycleTick) {
			case 1:
				this.doTick1();
				break;
			case 2:
				this.doTick2Or5();
				break;
			case 3:
				this.doTick3();
				break;
			case 4:
				this.doTick4();
				break;
			case 5:
				this.doTick2Or5();
				break;
			case 6:
				this.doTick6();
				break;
			case 7:
			case 8:
			case 9:
			case 10:
				this.doTick7To10();
				break;
			}
		}
		if (this.isDying) {
			if (this.standStillCounter > 2) {
				++baRunnersKilled;
				--baRunnersAlive;
				this.print("Urghhh!");
				this.despawnCountdown = 2;
			}
		}
	}
}
ruRunner.prototype.doMovement = function() { // TODO: Doesn't consider diagonal movement block flags
	let startX = this.x;
	if (this.destinationX > startX) {
		if (!baTileBlocksPenance(startX + 1, this.y) && mCanMoveEast(startX, this.y)) {
			++this.x;
			this.standStillCounter = 0;
		}
	} else if (this.destinationX < startX && !baTileBlocksPenance(startX - 1, this.y) && mCanMoveWest(startX, this.y)) {
		--this.x;
		this.standStillCounter = 0;
	}
	if (this.destinationY > this.y) {
		if (!baTileBlocksPenance(startX, this.y + 1) && !baTileBlocksPenance(this.x, this.y + 1) && mCanMoveNorth(startX, this.y) && mCanMoveNorth(this.x, this.y)) {
			++this.y;
			this.standStillCounter = 0;
		}
	} else if (this.destinationY < this.y && !baTileBlocksPenance(startX, this.y - 1) && !baTileBlocksPenance(this.x, this.y - 1) && mCanMoveSouth(startX, this.y) && mCanMoveSouth(this.x, this.y)) {
		--this.y;
		this.standStillCounter = 0;
	}
}
ruRunner.prototype.tryTargetFood = function() {
	let xZone = this.x >> 3;
	let yZone = this.y >> 3;
	let firstFoodFound = null;
	let endXZone = Math.max(xZone - 1 , 0);
	let endYZone = Math.max(yZone - 1, 0);
	for (let x = Math.min(xZone + 1, mItemZonesWidth - 1); x >= endXZone; --x) {
		for (let y = Math.min(yZone + 1, mItemZonesHeight - 1); y >= endYZone; --y) {
			let itemZone = mGetItemZone(x, y);
			for (let foodIndex = itemZone.length - 1; foodIndex >= 0; --foodIndex) {
				let food = itemZone[foodIndex];
				if (!mHasLineOfSight(this.x, this.y, food.x, food.y)) {
					continue;
				}
				if (firstFoodFound === null) {
					firstFoodFound = food;
				}
				if (Math.max(Math.abs(this.x - food.x), Math.abs(this.y - food.y)) <= ruSniffDistance) {
					this.foodTarget = firstFoodFound;
					this.destinationX = firstFoodFound.x;
					this.destinationY = firstFoodFound.y;
					this.targetState = 0;
					this.print("(target food)");
					return;
				}
			}
		}
	}
}
ruRunner.prototype.tryEatAndCheckTarget = function() {
	if (this.foodTarget !== null) {
		let itemZone = mGetItemZone(this.foodTarget.x >>> 3, this.foodTarget.y >>> 3);
		let foodIndex = itemZone.indexOf(this.foodTarget);
		if (foodIndex === -1) {
			this.foodTarget = null;
			this.targetState = 0;
			this.print("(crash)");
			return true;
		} else if (this.x === this.foodTarget.x && this.y === this.foodTarget.y) {
			if (this.foodTarget.isGood) {
				this.print("Chomp, chomp.");
				if (baIsNearTrap(this.x, this.y)) {
					this.isDying = true;
				}
			} else {
				this.print("Blughhhh.");
				this.blughhhhCountdown = 3;
				this.targetState = 0;
				if (this.cycleTick > 5) {
					this.cycleTick -= 5;
				}
				this.setDestinationBlughhhh();
			}
			itemZone.splice(foodIndex, 1);
			return true;
		}
	}
	return false;
}
ruRunner.prototype.cancelDestination = function() {
	this.destinationX = this.x;
	this.destinationY = this.y;
}
ruRunner.prototype.setDestinationBlughhhh = function() {
	this.destinationX = this.x;
	this.destinationY = baEAST_TRAP_Y + 4;
}
ruRunner.prototype.setDestinationRandomWalk = function() {
	if (this.x <= 27) {
		if (this.y === 16 || this.y === 17) {	
			this.destinationX = 30;
			this.destinationY = 16;
			return;
		} else if (this.x === 25 && this.y === 15) {
			this.destinationX = 26;
			this.destinationY = 16;
			return;
		}
	} else if (this.x <= 32) {
		if (this.y <= 16) {
			this.destinationX = 30;
			this.destinationY = 14;
			return;
		}
	} else if (this.y === 15 || this.y === 16){
		this.destinationX = 31;
		this.destinationY = 16;
		return;
	}
	let direction = this.runnerRNG.rollMovement();
	if (direction === rngSOUTH) {
		this.destinationX = this.x;
		this.destinationY = this.y - 5;
	} else if (direction === rngWEST) {
		this.destinationX = this.x - 5;
		if (this.destinationX < baWEST_TRAP_X - 1) {
			this.destinationX = baWEST_TRAP_X - 1;
		}
		this.destinationY = this.y;
	} else {
		this.destinationX = this.x + 5;
		if (this.destinationX > baEAST_TRAP_X) {
			this.destinationX = baEAST_TRAP_X;
		}
		this.destinationY = this.y;
	}
}
ruRunner.prototype.doTick1 = function() {
	if (this.y === 14) {
		this.despawnCountdown = 3;
		this.print("Raaa!");
		return;
	}
	if (this.blughhhhCountdown > 0) {
		--this.blughhhhCountdown;
	} else {
		++this.targetState;
		if (this.targetState > 3) {
			this.targetState = 1;
		}
	}
	let ateOrTargetGone = this.tryEatAndCheckTarget();
	if (this.blughhhhCountdown === 0 && this.foodTarget === null) { // Could make this line same as tick 6 without any difference?
		this.cancelDestination();
	}
	if (!ateOrTargetGone) {
		this.doMovement();
	}
}
ruRunner.prototype.doTick2Or5 = function() {
	if (this.targetState === 2) {
		this.tryTargetFood();
	}
	this.doTick7To10();
}
ruRunner.prototype.doTick3 = function() {
	if (this.targetState === 3) {
		this.tryTargetFood();
	}
	this.doTick7To10();
}
ruRunner.prototype.doTick4 = function() {
	if (this.targetState === 1) {
		this.tryTargetFood();
	}
	this.doTick7To10();
}
ruRunner.prototype.doTick6 = function() {
	if (this.y === 14) {
		this.despawnCountdown = 3;
		this.print("Raaa!");
		return;
	}
	if (this.blughhhhCountdown > 0) {
		--this.blughhhhCountdown;
	}
	if (this.targetState === 3) {
		this.tryTargetFood();
	}
	let ateOrTargetGone = this.tryEatAndCheckTarget();
	if (this.blughhhhCountdown === 0 && (this.foodTarget === null || ateOrTargetGone)) {
		this.setDestinationRandomWalk();
	}
	if (!ateOrTargetGone) {
		this.doMovement();
	}
}
ruRunner.prototype.doTick7To10 = function() {
	let ateOrTargetGone = this.tryEatAndCheckTarget();
	if (!ateOrTargetGone) {
		this.doMovement();
	}
}
ruRunner.prototype.print = function(string) {
	console.log(baTickCounter + ": Runner " + this.id + ": " + string);
}
var ruSniffDistance;
//}
//{ BaArena - ba
const baWEST_TRAP_X = 15;
const baWEST_TRAP_Y = 33;
const baEAST_TRAP_X = 45;
const baEAST_TRAP_Y = 34;
const baWAVE1_RUNNER_SPAWN_X = 36;
const baWAVE1_RUNNER_SPAWN_Y = 47;
const baWAVE10_RUNNER_SPAWN_X = 42;
const baWAVE10_RUNNER_SPAWN_Y = 46;
const baWAVE1_DEFENDER_SPAWN_X = 33;
const baWAVE1_DEFENDER_SPAWN_Y = 16;
const baWAVE10_DEFENDER_SPAWN_X = 28;
const baWAVE10_DEFENDER_SPAWN_Y = 16;
function baInit(maxRunnersAlive, totalRunners, runnerMovements) {
	baRunners = [];
	baRunnersToRemove = [];
	baTickCounter = 0;
	baRunnersAlive = 0;
	baRunnersKilled = 0;
	baMaxRunnersAlive = maxRunnersAlive;
	baTotalRunners = totalRunners;
	baCollectorX = -1;
	baRunnerMovements = runnerMovements;
	baRunnerMovementsIndex = 0;
	baCurrentRunnerId = 1;
	simTickCountSpan.innerHTML = baTickCounter;
}
function baTick() {
	++baTickCounter;
	baRunnersToRemove.length = 0;
	for (let i = 0; i < baRunners.length; ++i) {
		baRunners[i].tick();
	}
	for (let i = 0; i < baRunnersToRemove.length; ++i) {
		let runner = baRunnersToRemove[i];
		let index = baRunners.indexOf(runner);
		baRunners.splice(index, 1);
	}
	if (baTickCounter > 1 && baTickCounter % 10 === 1 && baRunnersAlive < baMaxRunnersAlive && baRunnersKilled + baRunnersAlive < baTotalRunners) {
		let movements;
		if (baRunnerMovements.length > baRunnerMovementsIndex) {
			movements = baRunnerMovements[baRunnerMovementsIndex++];
		} else {
			movements = "";
		}
		if (mCurrentMap === mWAVE_1_TO_9) {
			baRunners.push(new ruRunner(baWAVE1_RUNNER_SPAWN_X, baWAVE1_RUNNER_SPAWN_Y, new rngRunnerRNG(movements), baCurrentRunnerId++));
		} else {
			baRunners.push(new ruRunner(baWAVE10_RUNNER_SPAWN_X, baWAVE10_RUNNER_SPAWN_Y, new rngRunnerRNG(movements), baCurrentRunnerId++));
		}
		++baRunnersAlive;
	}
	simTickCountSpan.innerHTML = baTickCounter;
}
function baDrawOverlays() { 
	if (mCurrentMap !== mWAVE_1_TO_9 && mCurrentMap !== mWAVE10) {
		return;
	}
	rSetDrawColor(160, 82, 45, 220);
	rrOutline(45, 34);
	rrOutline(15, 33);
	rSetDrawColor(240, 10, 10, 220);
	if (mCurrentMap === mWAVE_1_TO_9) {
		rrOutline(18, 45);
	} else {
		rrOutline(18, 46);
	}
	rrOutline(24, 47);
	rrFill(33, 14);
	rSetDrawColor(10, 10, 240, 220);
	if (mCurrentMap === mWAVE_1_TO_9) {
		rrOutline(36, 47);
	} else {
		rrOutline(42, 46);
	}
	rrFill(34, 14);
	rSetDrawColor(10, 240, 10, 220);
	if (mCurrentMap === mWAVE_1_TO_9) {
		rrOutline(42, 45);
	} else {
		rrOutline(36, 47);
	}
	rrFill(35, 14);
	rSetDrawColor(240, 240, 10, 220);
	rrFill(36, 14);
}
function baDrawDetails() {
	if (mCurrentMap !== mWAVE_1_TO_9 && mCurrentMap !== mWAVE10) {
		return;
	}
	rSetDrawColor(160, 82, 45, 255);
	rrCone(40, 40);
	rrCone(40, 39);
	rrCone(41, 40);
	rrCone(41, 39);
	rrCone(43, 39);
	rrCone(36, 42);
	rrCone(36, 43);
	rrCone(37, 42);
	rrCone(37, 43);
	rrCone(39, 44);
	rrCone(43, 30);
	rrCone(43, 31);
	rrCone(44, 30);
	rrCone(44, 31);
	rrCone(45, 32);
	if (mCurrentMap === mWAVE_1_TO_9) {
		rrFillItem(29, 46);
		rrFillItem(28, 47);
	} else {
		rrFillItem(30, 46);
		rrFillItem(29, 47);
	}
	rSetDrawColor(127, 127, 127, 255);
	rrFillItem(32, 42);
}
function baDrawEntities() {
	rSetDrawColor(10, 10, 240, 127);
	for (let i = 0; i < baRunners.length; ++i) {
		rrFill(baRunners[i].x, baRunners[i].y);
	}
	if (baCollectorX !== -1) {
		rSetDrawColor(240, 240, 10, 200);
		rrFill(baCollectorX, baCollectorY);
	}
}
function baIsNearTrap(x, y) {
	return (Math.abs(x - baEAST_TRAP_X) < 2 && Math.abs(y - baEAST_TRAP_Y) < 2) || (Math.abs(x - baWEST_TRAP_X) < 2 && Math.abs(y - baWEST_TRAP_Y) < 2);
}
function baTileBlocksPenance(x, y) {
	if (x === plX && y === plY) {
		return true;
	}
	if (x === baCollectorX && y === baCollectorY) {
		return true;
	}
	if (y === 30) {
		if (x >= 20 && x <= 22) {
			return true;
		}
		if (mCurrentMap === mWAVE_1_TO_9 && x >= 39 && x <= 41) {
			return true;
		}
	} else if (x === 46 && y >= 17 && y <= 20) {
		return true;
	} else if (mCurrentMap === mWAVE_1_TO_9 && x === 27 && y === 32) {
		return true;
	}
	return false;
}
var baRunners;
var baRunnersToRemove;
var baTickCounter;
var baRunnersAlive;
var baRunnersKilled;
var baTotalRunners;
var baMaxRunnersAlive;
var baCollectorX;
var baCollectorY;
var baRunnerMovements;
var baRunnerMovementsIndex;
var baCurrentRunnerId;
//}
//{ Map - m
const mWAVE_1_TO_9 = [16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097156,2097154,2097154,2097154,2097154,2228480,2228480,2228480,2228480,2097154,2097154,2097154,2097154,2097153,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2097156,2097408,96,2097440,2097440,32,0,0,0,0,131360,131360,131360,131376,2097408,2097153,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,131328,131328,131328,2228480,2097156,2097154,2097154,2097408,64,0,2097408,2097408,0,0,0,0,0,0,0,0,0,16,2097408,2097154,2097154,2097154,2097154,2097154,2097154,2097154,2097154,2097154,2097153,2228480,2228480,2228480,2228480,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,131328,2228480,2097156,2097154,2097154,2097408,352,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,32,32,32,32,32,32,131362,131386,2228608,131328,0,0,2228480,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,131328,131328,2097156,2097408,96,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,32,0,0,0,0,0,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2228480,131328,131328,2097160,192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2228480,131328,2097156,2097408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,131328,2097156,2097408,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,131328,131328,0,0,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2228480,2228480,2097160,192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131360,131368,2097538,0,131328,0,0,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2228480,2228480,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131368,2097280,0,131328,131328,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2228480,2097156,2097408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131336,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,131328,2097156,2097408,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2097160,192,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,131328,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,131328,2097160,128,0,0,0,0,0,4104,65664,0,4104,65664,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4104,65664,0,4104,65664,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,131328,2097160,129,0,0,0,0,0,5130,65664,0,4104,66690,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5130,65664,0,4104,66690,0,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,2097168,2097408,0,0,0,0,4104,2310560,0,0,0,2249000,65664,0,0,0,0,0,0,0,0,0,0,0,0,4104,2310560,0,0,0,2249000,65664,0,0,0,0,8,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2228480,2228480,2097160,128,0,0,0,4104,65664,0,0,0,4104,65664,0,0,0,0,0,0,0,0,0,0,0,0,4104,65664,0,0,0,4104,65664,0,0,0,0,12,2097280,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2228480,2097156,2097408,0,0,0,0,4104,65664,0,262144,131328,4104,65664,0,0,0,0,0,0,0,0,0,0,0,0,4104,65664,0,262144,131328,4104,65664,0,0,0,4,2097408,2097216,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2097156,2097408,64,0,0,0,0,4104,2295170,1026,1026,1026,2233610,65664,0,0,0,0,0,0,0,0,0,0,0,0,4104,2295170,1026,1026,1026,2233610,65664,0,0,0,2097408,2097216,2228480,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2097160,192,0,0,0,0,0,0,16416,16416,16416,16416,16416,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16416,16416,16416,16416,16416,0,0,0,8,2097280,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2097160,129,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2097168,2097408,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2097408,2097153,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2228480,2097168,2097408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24,2097280,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2228480,2228480,2228480,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,2097280,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2228480,131328,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,2097408,2097216,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2228480,2097160,129,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2097408,2097216,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2228480,2097168,2097408,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8,2097280,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2228480,2228480,2097168,2097408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,2097280,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,129,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,2097408,2097216,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097168,2097408,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,4,2097408,2097216,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097168,2228480,2228480,2228480,2097184,2097184,2097408,1,0,0,2,2,0,0,0,0,0,2,2,0,0,4,2097408,2097184,2097184,2228480,2228480,2228480,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097168,2228480,2228480,2228480,2097184,2097184,2097408,3,2,6,2097408,2097184,2097184,2228480,2228480,2228480,2097216,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097168,2097184,2097184,2097184,2097216,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216,16777216];
const mWAVE10 = [2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2097156,2097154,2097154,2097154,2097154,2228480,2228480,2228480,2228480,2097154,2097154,2097154,2097154,2228481,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097156,2097408,96,2097440,2097440,32,0,0,0,0,131360,131360,131360,131376,2097408,2228481,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,131328,131328,131328,2228480,2097156,2097154,2097154,2097408,64,0,2097408,2097408,0,0,0,0,0,0,0,0,0,16,2097408,2097154,2097154,2097154,2097154,2097154,2097154,2097154,2097154,2097154,2097153,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,131328,2097156,2097154,2097154,2097154,2097408,352,32,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,32,32,32,32,32,32,32,131362,131386,2097280,131328,0,0,131328,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097156,2097408,96,131360,32,0,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,131328,131328,0,131328,0,0,0,0,32,32,0,0,0,0,0,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,131328,2097156,2097408,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,131328,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097160,192,131328,0,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097156,2097408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,0,0,0,0,2,2,0,131328,131328,0,0,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097156,2097408,64,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,131360,131368,2097538,0,131328,0,0,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,192,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131368,2097280,0,131328,131328,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097160,128,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131336,2097280,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097156,2097408,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,0,0,0,2097408,2097153,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097156,2097408,131392,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,0,131328,131328,0,16,2097408,2097153,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097156,2097408,64,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,0,0,24,2097280,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097160,192,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,8,2097280,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,128,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,0,0,0,2097408,2097153,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,128,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16,2097408,2097153,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097156,2097408,131328,0,0,0,0,0,0,0,0,4104,65664,0,4104,65664,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,24,2097280,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097160,192,0,0,0,0,0,0,0,0,0,5130,65664,0,4104,66690,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,8,2097280,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097160,128,131328,131328,0,0,0,0,0,0,4104,2179488,0,0,0,2117928,65664,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,0,131340,2097280,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097160,129,131328,131328,0,0,0,0,0,0,4104,65664,0,0,0,4104,65664,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2097408,2097216,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097168,2097408,0,0,0,131328,0,0,0,0,4104,65664,0,262144,131328,4104,65664,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,8,2097280,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,128,0,131328,0,0,0,0,0,4104,2164098,1026,1026,1026,2102538,65664,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,2097280,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,129,0,0,0,0,0,0,0,0,16416,16416,16416,16416,16416,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,0,2097408,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097168,2097408,1,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,12,2097280,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097168,2097408,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,0,0,4,2097408,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097160,129,0,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,0,2097408,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097168,2097408,1,131328,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,0,12,2097280,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097168,2097408,0,0,0,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,131328,4,2097408,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097160,128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2097408,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097160,129,0,131328,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,131328,12,2097280,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2097168,2097408,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,2097408,2097216,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2097168,2097408,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,2097408,2097216,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097168,2097408,1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,4,2097408,2097216,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2097168,2228480,2228480,2228480,2097184,2097184,2097408,1,0,0,2,2,0,0,0,0,0,2,2,0,0,4,2097408,2097184,2097184,2228480,2228480,2228480,2097216,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097168,2228480,2228480,2228480,2097184,2097184,2097408,3,2,6,2097408,2097184,2097184,2228480,2228480,2228480,2097216,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097168,2097184,2097184,2097184,2097216,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2228480,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152,2097152];
const mLOS_FULL_MASK = 0x20000;
const mLOS_EAST_MASK = 0x1000;
const mLOS_WEST_MASK = 0x10000;
const mLOS_NORTH_MASK = 0x400;
const mLOS_SOUTH_MASK = 0x4000;
const mMOVE_FULL_MASK = 0x100 | 0x200000 | 0x40000 | 0x1000000; // 0x100 for objects, 0x200000 for unwalkable tiles such as water etc, 0x40000 is very rare but BA cannon has it. 0x1000000 is not confirmed to block move but outside ba arena 1-9.
const mMOVE_EAST_MASK = 0x8;
const mMOVE_WEST_MASK = 0x80;
const mMOVE_NORTH_MASK = 0x2;
const mMOVE_SOUTH_MASK = 0x20;
function mInit(map, widthTiles, heightTiles) {
	mSetMap(map, widthTiles, heightTiles);
}
function mSetMap(map, widthTiles, heightTiles) {
	mCurrentMap = map;
	mWidthTiles = widthTiles;
	mHeightTiles = heightTiles;
	mResetMap();
}
function mResetMap() {
	mItemZones = [];
	mItemZonesWidth = 1 + ((mWidthTiles - 1) >> 3);
	mItemZonesHeight = 1 + ((mHeightTiles - 1) >> 3);
	for (let xZone = 0; xZone < mItemZonesWidth; ++xZone) {
		for (let yZone = 0; yZone < mItemZonesHeight; ++yZone) {
			mItemZones[xZone + mItemZonesWidth*yZone] = [];
		}
	}
}
function mAddItem(item) {
	mGetItemZone(item.x >>> 3, item.y >>> 3).push(item);
}
function mGetItemZone(xZone, yZone) {
	return mItemZones[xZone + mItemZonesWidth*yZone];
}
function mGetTileFlag(x, y) {
	return mCurrentMap[x + y*mWidthTiles];
}
function mCanMoveEast(x, y) {
	return (mGetTileFlag(x + 1, y) & (mMOVE_WEST_MASK | mMOVE_FULL_MASK)) === 0;
}
function mCanMoveWest(x, y) {
	return (mGetTileFlag(x - 1, y) & (mMOVE_EAST_MASK | mMOVE_FULL_MASK)) === 0;
}
function mCanMoveNorth(x, y) {
	return (mGetTileFlag(x, y + 1) & (mMOVE_SOUTH_MASK | mMOVE_FULL_MASK)) === 0;
}
function mCanMoveSouth(x, y) {
	return (mGetTileFlag(x, y - 1) & (mMOVE_NORTH_MASK | mMOVE_FULL_MASK)) === 0;
}
function mDrawGrid() {
	for (var xTile = 0; xTile < mWidthTiles; ++xTile) {
		if (xTile % 8 == 7) {
			rSetDrawColor(0, 0, 0, 72);
		} else {
			rSetDrawColor(0, 0, 0, 48);
		}
		rrEastLineBig(xTile, 0, 64);
	}
	for (var yTile = 0; yTile < mHeightTiles; ++yTile) {
		if (yTile % 8 == 7) {
			rSetDrawColor(0, 0, 0, 72);
		} else {
			rSetDrawColor(0, 0, 0, 48);
		}
		rrNorthLineBig(0, yTile, 64);
	}
}
function mDrawItems() {
	let endI = mItemZones.length;
	for (let i = 0; i < endI; ++i) {
		let itemZone = mItemZones[i];
		let endJ = itemZone.length;
		for (let j = 0; j < endJ; ++j) {
			let item = itemZone[j];
			rSetDrawColor(item.colorRed, item.colorGreen, item.colorBlue, 127);
			rrFillItem(item.x, item.y);
		}
	}
}
function mDrawMap() {
	rSetDrawColor(206, 183, 117, 255);
	rClear();
	for (let y = 0; y < 64; ++y) {	
		for (let x = 0; x < 64; ++x) {
			let tileFlag = mGetTileFlag(x, y);
			if ((tileFlag & mLOS_FULL_MASK) !== 0) {
				rSetDrawColor(0, 0, 0, 255);
				rrFillOpaque(x, y);
			} else  {
				if ((tileFlag & mMOVE_FULL_MASK) !== 0) {
					rSetDrawColor(127, 127, 127, 255);
					rrFillOpaque(x, y);
				}
				if ((tileFlag & mLOS_EAST_MASK) !== 0) {
					rSetDrawColor(0, 0, 0, 255);
					rrEastLine(x, y);
				} else if ((tileFlag & mMOVE_EAST_MASK) !== 0) {
					rSetDrawColor(127, 127, 127, 255);
					rrEastLine(x, y);
				}
				if ((tileFlag & mLOS_WEST_MASK) !== 0) {
					rSetDrawColor(0, 0, 0, 255);
					rrWestLine(x, y);
				} else if ((tileFlag & mMOVE_WEST_MASK) !== 0) {
					rSetDrawColor(127, 127, 127, 255);
					rrWestLine(x, y);
				}
				if ((tileFlag & mLOS_NORTH_MASK) !== 0) {
					rSetDrawColor(0, 0, 0, 255);
					rrNorthLine(x, y);
				} else if ((tileFlag & mMOVE_NORTH_MASK) !== 0) {
					rSetDrawColor(127, 127, 127, 255);
					rrNorthLine(x, y);
				}
				if ((tileFlag & mLOS_SOUTH_MASK) !== 0) {
					rSetDrawColor(0, 0, 0, 255);
					rrSouthLine(x, y);
				} else if ((tileFlag & mMOVE_SOUTH_MASK) !== 0) {
					rSetDrawColor(127, 127, 127, 255);
					rrSouthLine(x, y);
				}
			}
		}
	}
}
function mHasLineOfSight(x1, y1, x2, y2) {
	let dx = x2 - x1;
	let dxAbs = Math.abs(dx);
	let dy = y2 - y1;
	let dyAbs = Math.abs(dy);
	if (dxAbs > dyAbs) {
		let xTile = x1;
		let y = y1 << 16;
		let slope = Math.trunc((dy << 16) / dxAbs);
		let xInc;
		let xMask;
		if (dx > 0) {
			xInc = 1;
			xMask = mLOS_WEST_MASK | mLOS_FULL_MASK;
		} else {
			xInc = -1;
			xMask = mLOS_EAST_MASK | mLOS_FULL_MASK;
		}
		let yMask;
		y += 0x8000;
		if (dy < 0) {
			y -= 1;
			yMask = mLOS_NORTH_MASK | mLOS_FULL_MASK;
		} else {
			yMask = mLOS_SOUTH_MASK | mLOS_FULL_MASK;
		}
		while (xTile !== x2) {
			xTile += xInc;
			let yTile = y >>> 16;
			if ((mGetTileFlag(xTile, yTile) & xMask) !== 0) {
				return false;
			}
			y += slope;
			let newYTile = y >>> 16;
			if (newYTile !== yTile && (mGetTileFlag(xTile, newYTile) & yMask) !== 0) {
				return false;
			}
		}
	} else {
		let yTile = y1;
		let x = x1 << 16;
		let slope = Math.trunc((dx << 16) / dyAbs);
		let yInc;
		let yMask;
		if (dy > 0) {
			yInc = 1;
			yMask = mLOS_SOUTH_MASK | mLOS_FULL_MASK;
		} else {
			yInc = -1;
			yMask = mLOS_NORTH_MASK | mLOS_FULL_MASK;
		}
		let xMask;
		x += 0x8000;
		if (dx < 0) {
			x -= 1;
			xMask = mLOS_EAST_MASK | mLOS_FULL_MASK;
		} else {
			xMask = mLOS_WEST_MASK | mLOS_FULL_MASK;
		}
		while (yTile !== y2) {
			yTile += yInc;
			let xTile = x >>> 16;
			if ((mGetTileFlag(xTile, yTile) & yMask) !== 0) {
				return false;
			}
			x += slope;
			let newXTile = x >>> 16;
			if (newXTile !== xTile && (mGetTileFlag(newXTile, yTile) & xMask) !== 0) {
				return false;
			}
		}
	}
	return true;
}
var mCurrentMap;
var mWidthTiles;
var mHeightTiles;
var mItemZones;
var mItemZonesWidth;
var mItemZonesHeight;
//}
//{ RsRenderer - rr
function rrInit(tileSize) {
	rrTileSize = tileSize;
}
function rrSetTileSize(size) {
	rrTileSize = size;
}
function rrSetSize(widthTiles, heightTiles) {
	rrWidthTiles = widthTiles;
	rrHeightTiles = heightTiles;
	rResizeCanvas(rrTileSize*rrWidthTiles, rrTileSize*rrHeightTiles);
}
function rrFillOpaque(x, y) {
	rSetFilledRect(x*rrTileSize, y*rrTileSize, rrTileSize, rrTileSize);
}
function rrFill(x, y) {
	rDrawFilledRect(x*rrTileSize, y*rrTileSize, rrTileSize, rrTileSize);
}
function rrOutline(x, y) {
	rDrawOutlinedRect(x*rrTileSize, y*rrTileSize, rrTileSize, rrTileSize);
}
function rrOutlineBig(x, y, width, height) {
	rDrawOutlinedRect(x*rrTileSize, y*rrTileSize, rrTileSize*width, rrTileSize*height);
}
function rrWestLine(x, y) {
	rDrawVerticalLine(x*rrTileSize, y*rrTileSize, rrTileSize);
}
function rrWestLineBig(x, y, length) {
	rDrawHorizontalLine(x*rrTileSize, y*rrTileSize, rrTileSize*length)
}
function rrEastLine(x, y) {
	rDrawVerticalLine((x + 1)*rrTileSize - 1, y*rrTileSize, rrTileSize);
}
function rrEastLineBig(x, y, length) {
	rDrawVerticalLine((x + 1)*rrTileSize - 1, y*rrTileSize, rrTileSize*length);
}
function rrSouthLine(x, y) {
	rDrawHorizontalLine(x*rrTileSize, y*rrTileSize, rrTileSize);
}
function rrSouthLineBig(x, y, length) {
	rDrawHorizontalLine(x*rrTileSize, y*rrTileSize, rrTileSize*length);
}
function rrNorthLine(x, y) {
	rDrawHorizontalLine(x*rrTileSize, (y + 1)*rrTileSize - 1, rrTileSize);
}
function rrNorthLineBig(x, y, length) {
	rDrawHorizontalLine(x*rrTileSize, (y + 1)*rrTileSize - 1, rrTileSize*length);
}
function rrCone(x, y) {
	rDrawCone(x*rrTileSize, y*rrTileSize, rrTileSize);
}
function rrFillItem(x, y) {
	let padding = rrTileSize >>> 2;
	let size = rrTileSize - 2*padding;
	rDrawFilledRect(x*rrTileSize + padding, y*rrTileSize + padding, size, size);
}
var rrTileSize;
//}
//{ Renderer - r
const rPIXEL_ALPHA = 255 << 24;
function rInit(canvas, width, height) {
	rCanvas = canvas;
	rContext = canvas.getContext("2d");
	rResizeCanvas(width, height);
	rSetDrawColor(255, 255, 255, 255);
}
function rResizeCanvas(width, height) {
	rCanvas.width = width;
	rCanvas.height = height;
	rCanvasWidth = width;
	rCanvasHeight = height;
	rCanvasYFixOffset = (rCanvasHeight - 1)*rCanvasWidth;
	rImageData = rContext.createImageData(width, height);
	rPixels = new ArrayBuffer(rImageData.data.length);
	rPixels8 = new Uint8ClampedArray(rPixels);
	rPixels32 = new Uint32Array(rPixels);
}
function rSetDrawColor(r, g, b, a) {
	rDrawColorRB = r | (b << 16);
	rDrawColorG = rPIXEL_ALPHA | (g << 8);
	rDrawColor = rDrawColorRB | rDrawColorG;
	rDrawColorA = a + 1;
}
function rClear() {
	let endI = rPixels32.length;
	for (let i = 0; i < endI; ++i) {
		rPixels32[i] = rDrawColor;
	}
}
function rPresent() {
	rImageData.data.set(rPixels8);
	rContext.putImageData(rImageData, 0, 0);
}
function rDrawPixel(i) {
	let color = rPixels32[i];
	let oldRB = color & 0xFF00FF;
	let oldAG = color & 0xFF00FF00;
	let rb = oldRB + (rDrawColorA*(rDrawColorRB - oldRB) >> 8) & 0xFF00FF;
	let g = oldAG + (rDrawColorA*(rDrawColorG - oldAG) >> 8) & 0xFF00FF00;
	rPixels32[i] = rb | g;
}
function rDrawHorizontalLine(x, y, length) {
	let i = rXYToI(x, y)
	let endI = i + length;
	for (; i < endI; ++i) {
		rDrawPixel(i);
	}
}
function rDrawVerticalLine(x, y, length) {
	let i = rXYToI(x, y);
	let endI = i - length*rCanvasWidth;
	for (; i > endI; i -= rCanvasWidth) {
		rDrawPixel(i);
	}
}
function rSetFilledRect(x, y, width, height) {
	let i = rXYToI(x, y);
	let rowDelta = width + rCanvasWidth;
	let endYI = i - height*rCanvasWidth;
	while (i > endYI) {
		let endXI = i + width;
		for (; i < endXI; ++i) {
			rPixels32[i] = rDrawColor;
		}
		i -= rowDelta;
	}
}
function rDrawFilledRect(x, y, width, height) {
	let i = rXYToI(x, y);
	let rowDelta = width + rCanvasWidth;
	let endYI = i - height*rCanvasWidth;
	while (i > endYI) {
		let endXI = i + width;
		for (; i < endXI; ++i) {
			rDrawPixel(i);
		}
		i -= rowDelta;
	}
}
function rDrawOutlinedRect(x, y, width, height) {
	rDrawHorizontalLine(x, y, width);
	rDrawHorizontalLine(x, y + height - 1, width);
	rDrawVerticalLine(x, y + 1, height - 2);
	rDrawVerticalLine(x + width - 1, y + 1, height - 2);
}
function rDrawCone(x, y, width) { // Not optimised to use i yet
	let lastX = x + width - 1;
	let endI = (width >>> 1) + (width & 1);
	for (let i = 0; i < endI; ++i) {
		rDrawPixel(rXYToI(x + i, y));
		rDrawPixel(rXYToI(lastX - i, y));
		++y;
	}
}
function rXYToI(x, y) {
	return rCanvasYFixOffset + x - y*rCanvasWidth;
}
var rCanvas;
var rCanvasWidth;
var rCanvasHeight;
var rCanvasYFixOffset;
var rContext;
var rImageData;
var rPixels;
var rPixels8;
var rPixels32;
var rDrawColor;
var rDrawColorRB;
var rDrawColorG;
var rDrawColorA;
//}