document.addEventListener('DOMContentLoaded', function (){
	var debug = true,
	debugdata = false,
	log = function log(x) {
		if (typeof console !== 'undefined' && debug)
			console.log(x)
	},
	canvas = document.getElementById('vis'),
	ctx = canvas.getContext('2d'),
	prepareCanvas = (function prepareCanvas(bgLoaded, maskLoaded) {
		var background = bgLoaded[0].target;
		canvas.width = background.width;
		canvas.height = background.height;
		return maskLoaded[0].target
	}),
	processPosts = (function unpack (data, lightmask) {
		return [data[0][0], lightmask[0]];
	})
	.then(function processPosts(args) {
		var response = args[0],
		lightmask = args[1];
		if (response.status !== 200 && response.status !== 304) {
			log("oops, HTTP " + response.status);
			return null
		} else {
			log("found, HTTP " + response.status);
		}

		var raw = JSON.parse(response.text),
		roundDown = function (x) {
			return x-x%raw.conf.secondsPerInterval
		},
		// assume the data is in order
		data = {
			first: roundDown(raw.posts[0].time),
			last: roundDown(raw.posts[raw.posts.length-1].time),
			conf: raw.conf
		};
		raw.posts.forEach(function (post) {
			var time = roundDown(parseInt(post.time, 10));
			if (!(time in data))
				data[time] = [];
			data[time].push({
				longitude: parseFloat(post.longitude),
				latitude: parseFloat(post.latitude)
			})
		});

		return [data, lightmask]
	})
	.then(function animatePosts(args) {
		var data = args[0],
		lightmask = args[1],
		width = canvas.width,
		height = canvas.height,
		timer = data.first,
		lastFrame = data.last + data.conf.queueLength*data.conf.secondsPerInterval;
		queue = [],
		drawdot = function drawdot(coords) {
			ctx.beginPath();
			ctx.arc(Math.floor((180+coords.longitude)%360*width/360), Math.floor((90-coords.latitude)*height/180), data.conf.dotSize/2, 0, Math.PI*2, true); 
			ctx.closePath();
			ctx.fill();
		},
		dawn = function dawn(time) {
			// meh, this shouldn't draw the mask every time
			var offset = Math.floor(((3600-43200-time)%86400)/86400*width)
			ctx.globalAlpha = 0.25;
			ctx.drawImage(lightmask, offset, 0);
			ctx.globalAlpha = 1;
		},
		paint = function paint(queue) {
			queue.forEach(function (dots, i) {
				ctx.fillStyle = 'rgba(255,255,0,'+i/data.conf.queueLength+')';
				if (dots !== null)
					dots.forEach(drawdot);
			});
		},
		tick = window.setInterval(function () {
			queue.push(data[timer] || null);
			if (queue.length >= data.conf.queueLength)
				queue.shift();
			ctx.clearRect(0, 0, width, height);
			dawn(timer);
			paint(queue);
			timer += data.conf.secondsPerInterval;
			if (timer >= lastFrame)
				window.clearInterval(tick);
		}, data.conf.intervalMs);
	})
	.accumulate(2);

	// go
	load(['img/worldmap.jpg', 'img/lightmask.png']).then(prepareCanvas).then(processPosts.fix(1)).run();
	load([debugdata ? 'postdata-sample.json' : 'data/posts.json']).then(processPosts.fix(0)).run();
	// then(reset)?
}, false);

/* 
 * library functions
 * inspired by Arrowlets
 * http://www.cs.umd.edu/projects/PL/arrowlets/
 * here be dragons
 */
// asynchronous loading of content, starting a pipe
function load(paths) {
	function loadImage(path, callback) {
		var img = document.createElement('img');
		img.addEventListener('load', callback, false);
		img.src = path;
	}
	function loadResource(path, callback) {
		var req = new XMLHttpRequest();
		req.open('GET', path, true);
		req.onreadystatechange = function () {
			if (req.readyState === 4)
				callback({
					text: req.responseText,
					status: req.status
				});
		};
		req.send(null);
	}
	return ({ then: function (callback) {
		return new Async(callback.accumulate(paths.length), function (callback) {
			paths.forEach(function (path, i) {
				(/\.(png|jpg|gif)$/.test(path) ? loadImage : loadResource)
					(path, callback.fix(i));
			});
		})
	}})
}
// asynchronous pipe
function Async(fun, hook) {
	this.fun = fun;
	this.hook = hook;
}
Async.prototype.then = function (fun) {
	// some crocheting
	return new Async(Function.prototype.then.call(this.fun, fun), this.hook)
}
Async.prototype.run = function () {
	return this.hook(this.fun)
}

// synchronous pipe
Function.prototype.then = function (g) {
	var f = this;
	return function () {
		var x = Array.prototype.slice.apply(arguments),
		res = f.apply(this, x);
		// null -> fall-through
		if (res === null)
			return null
		else
			return g(res)
	}
}
// defer a function call n-1 times
// every call returns to accumulator[i]
// undefined return values are not filtered
// at the end, f gets called with [args, args, ...]
Function.prototype.accumulate = function (n) {
	var called = 0,
	accumulator = new Array(n),
	f = this;
	// keep the order
	// don't pass i and this will break in exciting ways
	// NOTE perhaps make a version that doesn't keep order?
	return function (i) {
		accumulator[i] = Array.prototype.slice.call(arguments, 1);
		if (++called < n)
			return null
		else
			return f.apply(this, accumulator) // flatten?
	}
}
// alias for f(), analogous to Async, but largely useless
Function.prototype.run = function () {
	return this.apply(this, Array.prototype.slice.apply(arguments))
}
// fix the first arguments of a function
// useful for assigning 'slots' when using accumulate
Function.prototype.fix = function () {
	var f = this,
	args = Array.prototype.slice.apply(arguments);
	return function () {
		return f.apply(this, args.concat(Array.prototype.slice.apply(arguments)))
	}
}
