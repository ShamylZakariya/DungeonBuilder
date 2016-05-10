(function () {

	"use strict";

	/**
	 * Harness is a simpler wrapper for Canvas which simplifies the pixel operations needed by DungeonBuilder
	 * @param sourceCanvas the canvas which will be manipulated
	 * @param displayCanvas if provided, the current state of the sourceCanvas will be rendered to the displayCanvas when Harness.updateDisplayCanvas is called.
	 * @constructor
	 */
	var Harness = function (sourceCanvas, displayCanvas) {
		this.sourceCanvas = sourceCanvas;
		this.sourceContext = sourceCanvas.getContext("2d");
		this.imageData = this.sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

		if (!!displayCanvas) {
			this.setDisplayCanvas(displayCanvas);
		}
	};

	Harness.prototype.setDisplayCanvas = function (displayCanvas) {
		this.displayCanvas = displayCanvas;
		this.displayContext = displayCanvas.getContext("2d");

		this.displayContext.mozImageSmoothingEnabled = false;
		this.displayContext.webkitImageSmoothingEnabled = false;
		this.displayContext.msImageSmoothingEnabled = false;
		this.displayContext.imageSmoothingEnabled = false;
	};

	Harness.prototype.getWidth = function () {
		return this.imageData.width;
	};

	Harness.prototype.getHeight = function () {
		return this.imageData.height;
	};

	Harness.prototype.getImageData = function () {
		return this.imageData;
	};

	Harness.prototype.updateSourceCanvas = function () {
		// copy imageData back to sourceContext, so it can be made visible for debugging or blitting to displayCanvas
		this.sourceContext.putImageData(this.imageData, 0, 0);
	};

	Harness.prototype.updateDisplayCanvas = function () {
		if (!!this.displayContext) {
			this.updateSourceCanvas();
			this.displayContext.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
			this.displayContext.drawImage(this.sourceCanvas, 0, 0, this.displayCanvas.width, this.displayCanvas.height);
		}
	};

	Harness.prototype.getPixel = function (x, y) {

		if (x < 0 || y < 0 || x >= this.imageData.width || y >= this.imageData.height) {
			return null;
		}

		var offset = (~~x + (~~y * this.imageData.width)) * 4;
		var data = this.imageData.data;
		return [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
	};

	Harness.prototype.setPixel = function (x, y, color) {
		if (x < 0 || y < 0 || x >= this.imageData.width || y >= this.imageData.height) {
			return false;
		}

		var offset = (x + (y * this.imageData.width)) * 4;
		var data = this.imageData.data;
		data[offset] = color.red;
		data[offset + 1] = color.green;
		data[offset + 2] = color.blue;
		data[offset + 3] = color.alpha;

		return true;
	};

	Harness.prototype.isPixelClear = function (x, y) {
		var c = this.getPixel(x, y);
		if (!!c) {
			// zero alpha means open
			return c[3] == 0;
		} else {
			// pixel was out of bounds, so it's off limits
			return false;
		}
	};

	/**
	 * Check if the pixel at x,y is one of an array given color
	 */
	Harness.prototype.checkPixelColor = function (x, y, colors) {
		var px = this.getPixel(x, y);
		if (!!px) {
			if (colors instanceof Array) {
				for (var i = 0; i < colors.length; i++) {
					var color = colors[i];
					if (px[0] === color.red && px[1] === color.green && px[2] === color.blue && px[3] === color.alpha) {
						return true;
					}
				}
			} else {
				if (px[0] === colors.red && px[1] === colors.green && px[2] === colors.blue && px[3] === colors.alpha) {
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * Check that all pixels in a defined rect are of the provided color, or are among the colors in an array of colors
	 * @param x the left edge of the rect
	 * @param y the top edge of the rect
	 * @param w width of the rect
	 * @param h height of the rect
	 * @param colors a color, or an array of color
	 * @returns {boolean} true if all pixels in the array are the provided color, or in the array of provided colors
	 */
	Harness.prototype.checkRectColor = function (x, y, w, h, colors) {
		for (var j = 0; j < h; j++) {
			for (var i = 0; i < w; i++) {
				if (!this.checkPixelColor(x + i, y + j, colors)) {
					return false;
				}
			}
		}

		return true;
	};

	Harness.prototype.fillRect = function (x, y, width, height, color) {

		var left = Math.min(Math.max(x, 0), this.imageData.width);
		var right = Math.min(Math.max(x + width, 0), this.imageData.width);
		var top = Math.min(Math.max(y, 0), this.imageData.height);
		var bottom = Math.min(Math.max(y + height, 0), this.imageData.height);

		if (left === right || top === bottom || left === this.imageData.width || top === this.imageData.height) {
			return false;
		}

		var data = this.imageData.data;
		var r = color.red;
		var g = color.green;
		var b = color.blue;
		var a = color.alpha;

		for (var j = top; j < bottom; j++) {
			var rowOffset = j * this.imageData.width;
			for (var i = left; i < right; i++) {
				var offset = 4 * (rowOffset + i);
				data[offset] = r;
				data[offset + 1] = g;
				data[offset + 2] = b;
				data[offset + 3] = a;
			}
		}

		return true;
	};

	Harness.prototype.clearRect = function (x, y, width, height) {
		return this.fillRect(x, y, width, height, {red: 0, green: 0, blue: 0, alpha: 0});
	};

	/**
	 * Hash an RGBA value, where each value is in range [0,255] (EVEN ALPHA)
	 * @param r
	 * @param g
	 * @param b
	 * @param a
	 * @returns {string}
	 */
	Harness.rgbaHash = function (r, g, b, a) {
		if (a === undefined) {
			a = 255;
		}

		return r + "-" + g + "-" + b + "-" + a;
	};

	Harness.comparePixelToColor = function (px, color) {
		return !!px && px[0] === color.red && px[1] === color.green && px[2] === color.blue && px[3] === color.alpha;
	};

	/**
	 * Check if the pixel is one of the colors in an array
	 * @param px
	 * @param colors
	 * @returns {boolean}
	 */
	Harness.comparePixelToColors = function (px, colors) {
		for (var i = 0; i < colors.length; i++) {
			if (Harness.comparePixelToColor(px, colors[0])) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Create a color object
	 * @param r red component range [0,255]
	 * @param g green component range [0,255]
	 * @param b blue component range [0,255]
	 * @param a alpha component range [0,255] (OPTIONAL, defaults to 255)
	 * @returns {PixelColor}
	 */
	Harness.prototype.color = function (r, g, b, a) {
		r = Math.min(Math.max(r, 0), 255);
		g = Math.min(Math.max(g, 0), 255);
		b = Math.min(Math.max(b, 0), 255);

		if (typeof a !== 'number') {
			a = 255;
		}

		a = Math.min(Math.max(a, 0), 255);

		return {
			red: r,
			green: g,
			blue: b,
			alpha: a,
			hash: Harness.rgbaHash(r, g, b, a)
		};
	};

	///////////////////////////////////////////////////////////////////

	/**
	 * A simple stack that pushes/pops 2d points.
	 * @constructor
	 */
	var PointStack = function () {
		this.stack = [];
	};

	/**
	 * Push a point on the stack
	 * @param x
	 * @param y
	 */
	PointStack.prototype.push = function (x, y) {
		this.stack.push(x);
		this.stack.push(y);
	};

	/**
	 * Pop a point from the stack, returning an array of two values (x & y) or null if stack is empty
	 * @returns {number[]|null}
	 */
	PointStack.prototype.pop = function () {
		if (this.stack.length >= 2) {
			var y = this.stack.pop();
			var x = this.stack.pop();
			return [x, y];
		}
		return null;
	};

	/**
	 * Clear the stack
	 */
	PointStack.prototype.clear = function () {
		this.stack = [];
	};

	///////////////////////////////////////////////////////////////////

	/**
	 * A simple FloodFill implementation
	 * @param harness - the harness to use for pixel manipulation
	 * @param {PixelColor} fillColor - the color to fill with
	 * @param {PixelColor} testColor - contiguous spaces of this color will be filled
	 * @param {boolean} roomy - if true, pixels will need a space of 1 pixel around them to be candidates for filling
	 * @constructor
	 */
	var FloodFill = function (harness, fillColor, testColor, roomy) {
		this.harness = harness;
		this.width = harness.getWidth();
		this.height = harness.getHeight();
		this.pointStack = new PointStack();
		this.dirs = [[+1, 0], [-1, 0], [0, +1], [0, -1]];
		this.fillColor = fillColor;
		this.testColor = testColor;
		this.roomy = roomy;
	};

	/**
	 * Given a rect defining potential space for filling, and given this FloodFill instance is configured for roomy fills, find a suitable start point
	 * @param {PixelRect} rect - the search space for a suitable seed point
	 * @returns {PixelPoint|null} - either returns a suitable spot to start the fill or null
	 */
	FloodFill.prototype.findSuitableFillStartPointForRoomyFill = function (rect) {
		for (var y = rect.y; y < rect.y + rect.height; y++) {
			for (var x = rect.x; x < rect.x + rect.width; x++) {
				if (this.testPoint(x, y)) {
					return {x: x, y: y};
				}
			}
		}

		return null;
	};

	/**
	 * Execute a synchronous flood fill
	 * @param {number} x - the start x point
	 * @param {number} y - the start y point
	 */
	FloodFill.prototype.fill = function (x, y) {
		this.startFill(x, y);
		while (this.stepFill()) {
		}
	};

	/**
	 * Seed, but do not execute, a flood fill. The fill can be stepped manually by calling FloodFill.stepFill()
	 * @param {number} x - the start x point
	 * @param {number} y - the start y point
	 */
	FloodFill.prototype.startFill = function (x, y) {
		this.pointStack.clear();
		this.pointStack.push(x, y);
	};

	/**
	 * steps FloodFill algorithm once.
	 * @returns {boolean} - true if more steps are possible, false when flood fill algorithm has exhausted possible space
	 */
	FloodFill.prototype.stepFill = function () {
		var pa = this.pointStack.pop();
		if (!!pa) {
			var x = pa[0];
			var y = pa[1];
			this.harness.setPixel(x, y, this.fillColor);

			for (var i = 0; i < 4; i++) {
				var dir = this.dirs[i];
				var cx = x + dir[0];
				var cy = y + dir[1];

				if ((cx >= 0) && (cx + 1 <= this.width) && (cy >= 0) && (cy + 1 <= this.height) && this.testPoint(cx, cy)) {
					this.pointStack.push(cx, cy);
				}
			}

			return true;
		}

		return false;
	};

	FloodFill.prototype.testPoint = function (x, y) {

		var test;
		if (!!this.testColor) {
			test = this.harness.checkPixelColor(x, y, [this.testColor]);
		} else {
			test = this.harness.isPixelClear(x, y);
		}

		if (!test) {
			return false;
		}

		if (this.roomy) {

			if (!!this.testColor) {
				var passingColors = [this.testColor, this.fillColor];
				return (this.harness.checkPixelColor(x - 1, y - 1, passingColors) &&
				this.harness.checkPixelColor(x, y - 1, passingColors) &&
				this.harness.checkPixelColor(x + 1, y - 1, passingColors) &&
				this.harness.checkPixelColor(x - 1, y, passingColors) &&
				this.harness.checkPixelColor(x + 1, y, passingColors) &&
				this.harness.checkPixelColor(x - 1, y + 1, passingColors) &&
				this.harness.checkPixelColor(x, y + 1, passingColors) &&
				this.harness.checkPixelColor(x + 1, y + 1, passingColors));
			} else {
				return (this.harness.isPixelClear(x - 1, y - 1) &&
				this.harness.isPixelClear(x, y - 1) &&
				this.harness.isPixelClear(x + 1, y - 1) &&
				this.harness.isPixelClear(x - 1, y) &&
				this.harness.isPixelClear(x + 1, y) &&
				this.harness.isPixelClear(x - 1, y + 1) &&
				this.harness.isPixelClear(x, y + 1) &&
				this.harness.isPixelClear(x + 1, y + 1));
			}
		} else {
			return test;
		}
	};

	///////////////////////////////////////////////////////////////////

	var BoxGrower = function (harness, x, y, color, startingSeedCount) {
		this.id = BoxGrower.idCounter++;
		this.harness = harness;
		this.width = harness.getWidth();
		this.height = harness.getHeight();
		this.color = color;
		this.boxes = [];
		this.initialSeed = undefined;

		// colors that this BoxGrower touches (may be level color (black) or color of other BoxGrowers)
		this.adjacentColorHashes = undefined;

		// if enabled, each child has fewer seeds than the parent had. this results in a less
		// exhaustive fill of available space, since running out of seeds means no more fill.
		this.decrementSeedCountForChildren = false;

		// enabling this tends to produce diagonal wall junctions when meeting other box growers
		this.decrementSeedCountForParent = true;

		if (typeof x === "number" && typeof y === "number") {
			startingSeedCount = startingSeedCount || Number.MAX_VALUE;
			this.seed(x, y, startingSeedCount, 0);
		}
	};

	BoxGrower.idCounter = 0;

	BoxGrower.prototype.getId = function () {
		return this.id;
	};

	BoxGrower.prototype.getBoxes = function () {
		return this.boxes;
	};

	BoxGrower.prototype.getRootBox = function () {
		return this.boxes[0] || undefined;
	};

	BoxGrower.prototype.computeAdjacentColorHashes = function () {
		this.adjacentColorHashes = [];
		var adjacentColorTable = {};

		// walk our bounds, and record every color which isn't OUR color
		var y, ye, x, xe;
		var r = this.color.red;
		var g = this.color.green;
		var b = this.color.blue;
		var a = this.color.alpha;
		var bounds = this.getBoundingBox();
		var hash;
		for (y = bounds.y - 1, ye = bounds.y + bounds.height + 1; y < ye; y++) {
			for (x = bounds.x - 1, xe = bounds.x + bounds.width + 1; x < xe; x++) {
				var pixel = this.harness.getPixel(x, y);
				if (!!pixel) {
					hash = Harness.rgbaHash(pixel[0], pixel[1], pixel[2], pixel[3]);

					// if this pixel isn't our color, and we haven't visited it yet
					if ((pixel[0] !== r) || (pixel[1] !== g) || (pixel[2] !== b) || (pixel[3] != a)) {
						adjacentColorTable[hash] = true;
					}
				}
			}
		}

		for (hash in adjacentColorTable) {
			if (adjacentColorTable.hasOwnProperty(hash)) {
				this.adjacentColorHashes.push(hash);
			}
		}
	};

	BoxGrower.prototype.getAdjacentColorHashes = function () {
		return this.adjacentColorHashes;
	};

// get the position of the initial seed planted for this boxgrower, in form {x:number,y:number}
	BoxGrower.prototype.getInitialSeed = function () {
		return this.initialSeed;
	};

	BoxGrower.prototype.getColor = function () {
		return this.color;
	};

	BoxGrower.prototype.seed = function (x, y, seedCount, depth) {
		if (typeof depth !== 'number' || depth === undefined) {
			depth = 0;
		}

		x = Math.round(x);
		y = Math.round(y);

		if (this.harness.isPixelClear(x, y)) {
			var box = {x: x, y: y, width: 1, height: 1, done: false, seedCount: seedCount, depth: depth};
			this.drawBox(box);
			this.boxes.push(box);

			if (this.initialSeed === undefined) {
				this.initialSeed = {x: x, y: y};
			}

			return true;
		}

		return false;
	};

	// steps fill algorithm once. returns true if more steps are possible. false when complete.
	BoxGrower.prototype.step = function () {

		var i;
		var box;

		//grow our boxes
		for (i = 0; i < this.boxes.length; i++) {
			box = this.boxes[i];
			if (!box.done) {
				// grow box in each direction it can grow
				var north = this.growNorth(box);
				var south = this.growSouth(box);
				var east = this.growEast(box);
				var west = this.growWest(box);
				this.drawBox(box);

				if (!north && !south && !east && !west) {
					box.done = true;
				}
			}
		}

		// plant seeds in done boxes
		for (i = 0; i < this.boxes.length; i++) {
			box = this.boxes[i];
			if (box.done) {
				this.plantSeedsAroundPerimeter(box);
			}
		}

		// now, see if any living boxes remain
		for (i = 0; i < this.boxes.length; i++) {
			box = this.boxes[i];
			if (!box.done) {
				return true;
			}
		}

		// we're done, no active boxes
		return false;
	};

	BoxGrower.prototype.drawBox = function (box) {
		this.harness.fillRect(box.x, box.y, box.width, box.height, this.color);
	};

	BoxGrower.prototype.plantSeedsAroundPerimeter = function (box) {
		if (box.seedCount > 0) {

			var childSeedCount = box.seedCount;
			if (this.decrementSeedCountForChildren) {
				childSeedCount--;
			}

			for (var x = box.x; x < box.x + box.width; x++) {
				if (this.harness.isPixelClear(x, box.y - 1)) {
					if (this.seed(x, box.y - 1, childSeedCount, box.depth + 1)) {
						if (this.decrementSeedCountForParent) {
							box.seedCount--;
							if (box.seedCount <= 0) {
								return;
							}
						}
					}
				}

				if (this.harness.isPixelClear(x, box.y + box.height)) {
					if (this.seed(x, box.y + box.height, childSeedCount, box.depth + 1)) {
						if (this.decrementSeedCountForParent) {
							box.seedCount--;
							if (box.seedCount <= 0) {
								return;
							}
						}
					}
				}
			}

			for (var y = box.y; y < box.y + box.height; y++) {
				if (this.harness.isPixelClear(box.x - 1, y)) {
					if (this.seed(box.x - 1, y, childSeedCount, box.depth + 1)) {
						if (this.decrementSeedCountForParent) {
							box.seedCount--;
							if (box.seedCount <= 0) {
								return;
							}
						}
					}
				}

				if (this.harness.isPixelClear(box.x + box.width, y)) {
					if (this.seed(box.x + box.width, y, childSeedCount, box.depth + 1)) {
						if (this.decrementSeedCountForParent) {
							box.seedCount--;
							if (box.seedCount <= 0) {
								return;
							}
						}
					}
				}
			}
		}
	};

	BoxGrower.prototype.growNorth = function (box) {
		for (var i = 0; i < box.width; i++) {
			var x = box.x + i;
			var y = box.y - 1;
			if (!this.harness.isPixelClear(x, y)) {
				return false;
			}
		}

		box.y--;
		box.height++;
		return true;
	};

	BoxGrower.prototype.growSouth = function (box) {
		for (var i = 0; i < box.width; i++) {
			var x = box.x + i;
			var y = box.y + box.height;
			if (!this.harness.isPixelClear(x, y)) {
				return false;
			}
		}

		box.height++;
		return true;
	};

	BoxGrower.prototype.growEast = function (box) {
		for (var i = 0; i < box.height; i++) {
			var x = box.x + box.width;
			var y = box.y + i;
			if (!this.harness.isPixelClear(x, y)) {
				return false;
			}
		}

		box.width++;
		return true;
	};

	BoxGrower.prototype.growWest = function (box) {
		for (var i = 0; i < box.height; i++) {
			var x = box.x - 1;
			var y = box.y + i;
			if (!this.harness.isPixelClear(x, y)) {
				return false;
			}
		}

		box.x--;
		box.width++;
		return true;
	};

	BoxGrower.prototype.getBoundingBox = function () {
		var left = Number.MAX_VALUE;
		var top = Number.MAX_VALUE;
		var right = Number.MIN_VALUE;
		var bottom = Number.MIN_VALUE;
		for (var i = 0; i < this.boxes.length; i++) {
			var box = this.boxes[i];
			var boxRight = box.x + box.width;
			var boxBottom = box.y + box.height;

			left = Math.min(left, box.x);
			top = Math.min(top, box.y);
			right = Math.max(right, boxRight);
			bottom = Math.max(bottom, boxBottom);
		}

		return {
			x: left,
			y: top,
			width: right - left,
			height: bottom - top
		};
	};


	///////////////////////////////////////////////////////////


	var DungeonBuilder = function (harness) {
		this.harness = harness;
		this.boxersByColorHash = {};
		this.boxersById = {};
		this.roomConnectivityTable = {};
		this.voidColor = harness.color(0, 0, 0, 255);
		this.floorColor = harness.color(255, 255, 255);
	};

// Cardinal Directions
	DungeonBuilder.NORTH = 0;
	DungeonBuilder.EAST = 1;
	DungeonBuilder.SOUTH = 2;
	DungeonBuilder.WEST = 3;
	DungeonBuilder.CARDINAL_DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

	DungeonBuilder.prototype.build = function (animate, step, wiggle, frequency, rng, done) {

		if (typeof step !== 'number') {
			step = this.harness.getWidth() / 8;
		}

		if (typeof wiggle !== 'number') {
			wiggle = 0;
		}

		wiggle = Math.max(wiggle, 0);

		if (typeof frequency !== 'number') {
			frequency = 1;
		}

		frequency = Math.min(Math.max(frequency, 0), 1);


		this.seed(step, step * wiggle, frequency, rng);

		var onDone = function () {
			this.harness.updateDisplayCanvas();
			done && done();
		}.bind(this);

		if (animate) {
			var stepper = function () {
				var running = false;
				this.boxers.forEach(function (boxer) {
					if (boxer.step()) {
						running = true;
					}
				});

				this.harness.updateDisplayCanvas();
				if (running) {
					window.requestAnimationFrame(stepper);
				} else {
					this.generateRooms(onDone);
				}
			}.bind(this);

			window.requestAnimationFrame(stepper);
		} else {
			this.generateRooms(onDone);
		}
	};

	DungeonBuilder.prototype.getRooms = function () {
		return this.boxers;
	};

	/**
	 * Get all rooms touching a given room
	 * @param boxGrower the room to check for neighbors
	 * @returns {Array} of BoxGrower touching the queried one
	 */
	DungeonBuilder.prototype.getRoomsTouchingRoom = function (boxGrower) {
		var rooms = [];
		var hashes = boxGrower.getAdjacentColorHashes();
		for (var i = 0; i < hashes.length; i++) {
			var room = this.boxersByColorHash[hashes[i]];
			if (!!room) {
				rooms.push(room);
			}
		}

		return rooms;
	};

	DungeonBuilder.prototype.seed = function (step, wiggle, frequency, rng, x, y, width, height) {

		x = x || 0;
		y = y || 0;
		width = Math.min(width || this.harness.getWidth(), this.harness.getWidth());
		height = Math.min(height || this.harness.getHeight(), this.harness.getHeight());
		frequency = Math.min(Math.max(frequency || 0.5, 0), 1);
		step = Math.floor(step);
		rng = rng || Math.random;

		//console.log("DungeonBuilder::seed");

		this.boxers = [];
		for (var sy = y; sy < y + height; sy += step) {
			for (var sx = x; sx < x + width; sx += step) {

				var test = frequency < 1 ? (rng() < frequency) : true;

				if (test && this.harness.isPixelClear(sx, sy)) {

					// generate a unique color for this box - doesn't matter what it is, just that it's unique
					var cr = Math.round((sx / width) * 256);
					var cg = Math.round((sy / height) * 256);
					var cb = 128;
					var color = this.harness.color(cr, cg, cb);

					var boxX = Math.round(sx + (rng() * 2 - 1) * wiggle);
					var boxY = Math.round(sy + (rng() * 2 - 1) * wiggle);

					// plant a bog grower at this location
					var boxer = new BoxGrower(this.harness, boxX, boxY, color);
					if (boxer.getRootBox()) {
						this.boxers.push(boxer);
						this.boxersByColorHash[color.hash] = boxer;
						this.boxersById[boxer.getId()] = boxer;
					}
				}
			}
		}
	};

	DungeonBuilder.prototype.generateRooms = function (done) {
		//console.log("DungeonBuilder::generateRooms");

		// run all the boxers until they're exhausted
		var running = false;
		do {
			running = false;
			this.boxers.forEach(function (boxer) {
				if (boxer.step()) {
					running = true;
				}
			});
		} while (running);

		// filter out any boxers that didn't take, and compute adjacent color hashes for good ones
		// to help later when determining room-room connectivity
		var goodBoxers = [];
		this.boxers.forEach(function (boxer) {
			if (!!boxer.getBoundingBox() && !!boxer.getInitialSeed()) {
				boxer.computeAdjacentColorHashes();
				goodBoxers.push(boxer);
			}
		});

		this.boxers = goodBoxers;

		// paint the floors white
		for (var i = 0; i < this.boxers.length; i++) {
			var box = this.boxers[i];
			var ff = new FloodFill(this.harness, this.floorColor, box.getColor(), true);
			var initialPoint = ff.findSuitableFillStartPointForRoomyFill(box.getRootBox());
			if (!!initialPoint) {
				ff.fill(initialPoint.x, initialPoint.y);
			}
		}

		this.createDoors(done);
	};

	DungeonBuilder.prototype.createDoors = function (done) {
		//console.log("DungeonBuilder::createDoors");

		for (var i = 0; i < this.boxers.length; i++) {
			this.createDoorsForRoom(this.boxers[i]);
		}

		if (!!done) {
			done();
		}
	};

	/**
	 * Generate a hash code to represent the two rooms boxerA and boxerB - stable regardless of order of arguments.
	 */
	DungeonBuilder.prototype.roomToRoomHash = function (boxerA, boxerB) {
		if (boxerA.getId() < boxerB.getId()) {
			return boxerA.getColor().hash + '-' + boxerB.getColor().hash;
		} else {
			return boxerB.getColor().hash + '-' + boxerA.getColor().hash;
		}
	};

	/**
	 * Mark that a door has been tunneled between the neighbor rooms boxerA and boxerB
	 */
	DungeonBuilder.prototype.markDoorConnectingRooms = function (boxerA, boxerB) {
		// sanity check that these rooms touch
		var boxerANeighbors = this.getRoomsTouchingRoom(boxerA);
		var sane = false;
		for (var i = 0; i < boxerANeighbors.length; i++) {
			if (boxerANeighbors[i] === boxerB) {
				sane = true;
			}
		}

		if (sane) {
			this.roomConnectivityTable[this.roomToRoomHash(boxerA, boxerB)] = true;
		} else {
			console.error("DungeonBuilder::markDoorConnectingRooms boxerA and boxerB are not actually neighbors, can't have door connecting them!\nboxerA:", boxerA, "\nboxerB:", boxerB);
		}
	};

	/**
	 * return true iff boxerA and boxerB have had a door tunneled between them
	 */
	DungeonBuilder.prototype.areRoomsConnected = function (boxerA, boxerB) {
		return this.roomConnectivityTable[this.roomToRoomHash(boxerA, boxerB)] === true;
	};

	/*
	 Tunnels doors to each neighbor room of the provided room
	 */
	DungeonBuilder.prototype.createDoorsForRoom = function (boxer) {

		var possiblePositionsByRoomColor = {};
		var fc = this.floorColor;
		var bc = boxer.getColor();
		var vc = this.voidColor;
		var hash;

		var visitor = function (x, y, dir) {
			// walk in direction to find a pixel not our color nor floor color nor black, followed
			// by a pixel in floor color. If
			hash = null;
			for (var i = 0; i < 6; i++) {
				var tx = x + i * (DungeonBuilder.CARDINAL_DIRECTIONS[dir][0]);
				var ty = y + i * (DungeonBuilder.CARDINAL_DIRECTIONS[dir][1]);
				var p = this.harness.getPixel(tx, ty);

				if (!!p) {
					if (!hash &&
						(p[0] !== fc.red || p[1] !== fc.green || p[2] !== fc.blue || p[3] !== fc.alpha) &&
						(p[0] !== bc.red || p[1] !== bc.green || p[2] !== bc.blue || p[3] !== bc.alpha) &&
						(p[0] !== vc.red || p[1] !== vc.green || p[2] !== vc.blue || p[3] !== vc.alpha)) {
						// we've found a pixel not our color, floor color nor void color
						hash = Harness.rgbaHash(p[0], p[1], p[2], p[3]);
					} else if (hash &&
						p[0] === fc.red && p[1] === fc.green && p[2] === fc.blue && p[3] === fc.alpha) {
						// the next pixel is floor color - which means we've found a pixel in a neighbor room
						if (!!possiblePositionsByRoomColor[hash]) {
							possiblePositionsByRoomColor[hash].push([x, y, dir]);
						} else {
							possiblePositionsByRoomColor[hash] = [[x, y, dir]];
						}

						// we're done
						break;
					}
				}
			}
		}.bind(this);

		this.walkRoomPerimeter(boxer, visitor);

		// now, possiblePositionsByRoomColor has, for each adjacent room, a list of [x,y,dir] tuples,
		// pick one for each neighbor, write floor color to it, and mark a door

		for (hash in possiblePositionsByRoomColor) {
			if (possiblePositionsByRoomColor.hasOwnProperty(hash)) {
				var otherBoxer = this.boxersByColorHash[hash];

				// visit function can flag black (void) space, so check that this is an actual room hash
				if (!otherBoxer) {
					continue;
				}

				// check that a door doesn't already exist
				if (this.areRoomsConnected(boxer, otherBoxer)) {
					//console.log("rooms ", boxer.getColor().hash, ' and ', otherBoxer.getColor().hash, ' are already connected');
					continue;
				}

				var positions = possiblePositionsByRoomColor[hash];
				var position = positions[Math.floor(positions.length / 2)];
				var x = position[0];
				var y = position[1];
				var dir = position[2];

				// tunnel!
				for (var i = 0; i < 6; i++) {
					var tx = x + i * (DungeonBuilder.CARDINAL_DIRECTIONS[dir][0]);
					var ty = y + i * (DungeonBuilder.CARDINAL_DIRECTIONS[dir][1]);
					// stop tunnelling when we reach floor on other side
					if (this.harness.checkPixelColor(tx, ty, this.floorColor) && i > 0) {
						break;
					}
					this.harness.setPixel(tx, ty, this.floorColor);
				}

				// mark that these rooms are connected so we don't make multiple doors
				this.markDoorConnectingRooms(boxer, otherBoxer);
			}
		}
	};

	/**
	 * Invokes visitor for each pixel in the perimeter of the room's floor, passing x,y,cardinal_direction
	 * @param boxer the room
	 * @param visitor function, taking x,y,direction
	 */
	DungeonBuilder.prototype.walkRoomPerimeter = function (boxer, visitor) {
		var bounds = boxer.getBoundingBox();
		var wallColor = boxer.getColor();
		var x, xe, y, ye;

		// mark each floorColor pixel which has at least one neighbor of wallColor
		for (y = bounds.y, ye = bounds.y + bounds.height; y < ye; y++) {
			for (x = bounds.x, xe = bounds.x + bounds.width; x < xe; x++) {

				// if this is a floor pixel
				if (this.harness.checkPixelColor(x, y, this.floorColor)) {
					if (this.harness.checkPixelColor(x - 1, y, wallColor)) {
						visitor(x, y, DungeonBuilder.WEST);
					}
					if (this.harness.checkPixelColor(x, y - 1, wallColor)) {
						visitor(x, y, DungeonBuilder.NORTH);
					}
					if (this.harness.checkPixelColor(x + 1, y, wallColor)) {
						visitor(x, y, DungeonBuilder.EAST);
					}
					if (this.harness.checkPixelColor(x, y + 1, wallColor)) {
						visitor(x, y, DungeonBuilder.SOUTH);
					}
				}
			}
		}
	};

	///////////////////////////////////////////////////////////////////

	function _build(boundaryImage, roomGridSize, wiggle, frequency, rng, done) {
		var minImageDim = Math.min(boundaryImage.width, boundaryImage.height);
		var step = minImageDim / roomGridSize;
		step = Math.min(Math.max(step, 10), minImageDim / 2);

		var workingCanvas = document.createElement("canvas");
		workingCanvas.width = boundaryImage.width;
		workingCanvas.height = boundaryImage.height;

		var workingCanvasContext = workingCanvas.getContext("2d");
		workingCanvasContext.drawImage(boundaryImage, 0, 0);

		var harness = new Harness(workingCanvas);
		var builder = new DungeonBuilder(harness);
		builder.build(false, step, wiggle, frequency, rng, function () {
			harness.updateSourceCanvas();
			if (!!done) {

				// generate room info
				var roomInfo = [];
				var boxGrowers = builder.getRooms();
				for (var i = 0; i < boxGrowers.length; i++) {
					var boxer = boxGrowers[i];
					roomInfo.push({
						color: boxer.getColor(),
						bounds: boxer.getBoundingBox()
					})
				}

				var info = {
					rooms: roomInfo,
					voidColor: builder.voidColor,
					floorColor: builder.floorColor
				};

				done(workingCanvas, harness, info);
			}
		});
	}

	/**
	 * A rectangle defined in pixel coordinates, with top-left origin
	 * @typedef {object} PixelRect
	 * @property {number} x - the x origin in the canvas in pixels
	 * @property {number} y - the y origin in the canvas in pixels
	 * @property {number} width - the width in pixels
	 * @property {number} height - the height in pixels
	 */

	/**
	 * A 2d point
	 * @typedef {object} PixelPoint
	 * @property {number} x - the x location in the canvas
	 * @property {number} y - the y location in the canvas
	 */

	/**
	 * A pixel color, RGBA, in integral values from 0 to 255
	 * @typedef {object} PixelColor
	 * @property {number} red - the red component [0,255]
	 * @property {number} green - the green component [0,255]
	 * @property {number} blue - the blue component [0,255]
	 * @property {number} alpha - the alpha component [0,255]
	 * @property {string} hash - a simple hash for this color
	 */

	/**
	 * Basic definition of a room generated by the DungeonGenerator
	 * @typedef {object} RoomInfo
	 * @property {PixelRect} bounds - the room's boundary
	 * @property {PixelColor} color - the color used to draw the room's walls
	 */

	/**
	 * @callback buildDoneCallback
	 * @param resultCanvas - the canvas upon which the dungeon has been rendered
	 * @param {Harness} harness - the harness used to manipulate canvas pixel data
	 * @param {object} info - The room info for the dungeon.
	 * @param {object} info.floorColor - the color representing traversable/walkable space
	 * @param {object} info.voidColor - the color representing space "outside" the dungeon.
	 * @param {RoomInfo[]} info.rooms - array of room info data
	 *
	 */

	/**
	 * @typedef {object} PixelSize
	 * @property {number} width - width in pixels
	 * @property {number} height - height in pixels
	 */

	/**
	 * Build a dungeon.
	 *
	 * You can specify an image to define boundaries of the dungeon. In this case you will provide an image URL, an Image object or a
	 * DOM HTMLImageElement - this image should use opaque black to define where the dungeon cannot go. Transparent pixels represent "free space" for the dungeon to populate.
	 * If you simply want to fill a rectangle with dungeon space, provide a PixelSize { width:, height: } object and the dungeon will occupy that space.
	 *
	 * @param {string|Image|Element|PixelSize} mapSpec - URL of an image, Image, or HTMLImageElement of loaded image in DOM to define the dungeon's boundaries. If PixelSize, an empty space of specified size will be created
	 * @param params - Parameters for dungeon generation
	 * @param {function} [params.rng=Math.random] - Random number generator returning a value from 0 to 1. Provide a seedable RNG to make repeatable structures.
	 * @param {number} [params.roomGridSize=20] - The map will be divided into a grid with this many rows and columns. The smaller the number, the bigger the rooms will be.
	 * @param {number} [params.wiggle=0] - The room placement will be randomly offset by at most this amount, ranged from 0 to 1. The higher the more random room generation will be.
	 * @param {number} [params.frequency=1] - The likelihood that a room will be planted at a given location. If 1, all room seeds will be planted, at 0.5 half will be planted, etc. Min value is 0.1.
	 * @param {buildDoneCallback} params.done - Callback invoked when dungeon is finished generating
	 */
	function build(mapSpec, params) {

		var roomGridSize = Math.max(typeof params.roomGridSize === 'number' ? params.roomGridSize : 20, 8);
		var wiggle = typeof params.wiggle === 'number' ? params.wiggle : 0;
		var frequency = typeof params.frequency === 'number' ? params.frequency : 1;
		var done = params.done;

		if (frequency <= 0) {
			frequency = 0.1;
		}

		var rng = null;
		if (typeof params.rng === 'function') {
			rng = params.rng;
		} else {
			rng = Math.random;
		}

		if (mapSpec instanceof HTMLImageElement || mapSpec instanceof Image) {
			_build(mapSpec, roomGridSize, wiggle, frequency, rng, done);
		} else if (typeof mapSpec === "string") {

			var img = new Image();
			img.src = mapSpec;
			img.onload = function () {
				_build(img, roomGridSize, wiggle, frequency, rng, done);
			}
		} else if (typeof mapSpec.width === 'number' && typeof mapSpec.height === 'number') {
			var emptyImage = new Image();
			emptyImage.width = mapSpec.width;
			emptyImage.height = mapSpec.height;
			_build(emptyImage, roomGridSize, wiggle, frequency, rng, done);
		}
	}

	///////////////////////////////////////////////////////////////////

	window.DungeonBuilder = {
		Harness: Harness,
		DungeonBuilder: DungeonBuilder,
		build: build
	}

})();

