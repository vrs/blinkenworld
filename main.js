document.addEventListener('DOMContentLoaded', function (){
	var debug = true,
	debugdata = false,
	log = function (x) {
		if (typeof console !== 'undefined' && debug)
			console.log(x)
	},
	canvas = document.getElementById('vis'),
	ctx = canvas.getContext('2d'),
	control = {tick: undefined, running: true}, // global control
	loadingMsg = function (name, paths) {
		var msg = document.createElement('p');
		msg.appendChild(document.createTextNode("Loading "+paths.join(", ")+"..."));
		msg.setAttribute('id', 'loadstatus-'+name);
		document.getElementById('loadstatus').appendChild(msg);
		return paths
	},
	loadingDone = function (name) {
		document.getElementById('loadstatus-'+name).appendChild(document.createTextNode(" Done."));
		return Array.prototype.slice.call(arguments, 1);
	},
	prepareCanvas = (function (loadEvent) {
		var background = loadEvent[0][0].target;
		canvas.width = background.width;
		canvas.height = background.height;
	}),
	processPosts = (function unpack (data) {
		return data[0][0][0]
	})
	.then(function processPosts(response) {
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

		return data
	})
	.then(function animatePosts(data) {
		var width = canvas.width,
		height = canvas.height,
		timer = data.first,
		lastFrame = data.last + data.conf.queueLength*data.conf.secondsPerInterval;
		queue = [],
		drawdot = function (coords) {
			ctx.beginPath();
			ctx.arc(Math.floor((180+coords.longitude)%360*width/360), Math.floor((90-coords.latitude)*height/180), data.conf.dotSize/2, 0, Math.PI*2, true); 
			ctx.closePath();
			ctx.fill();
		},
		dawn = (function () {
			// draw a daylight curve, not using brute force
			// google said http://astrosail.de/de/static/tutorial/best5.php?cat=42
			// current status: b0rken
			var pi = Math.PI,
			tanphi = Math.tan(pi/2 - (function () { // ecliptic (epsilon)
				var now = new Date(),
				jan01 = new Date(now.getFullYear(), 0, 1),
				dayOfYear = Math.ceil((now - jan01)/86400000);
				return 23.433*(pi/180)*Math.cos(2*pi*(dayOfYear+9)/365)
			})()),
			// calculate and interpolate 
			// this is quite fragile numerically - I'd be so happy if it just worked...
			// Should perhaps resort to splines
			curve = Array.init(73).map(function (nothing, i) { // initial values
				var rotation = i*pi/12;
				return [
					Math.atan(tanphi*Math.cos(rotation)), // value
					(1/(1+Math.pow(tanphi*Math.cos(rotation),2))) * tanphi*(-Math.sin(rotation)) * (pi/18) // slope
				]
			}).map(function (values, i) { // convert to canvas coordinates
				return [
					new Vector([
						i/24*canvas.width,
						(1+values[0]/(pi/2))*canvas.height/2]),
					new Vector([
						1/24*canvas.width,
						values[1]*canvas.height/2])
				]

			}).map(function (to, i, curve) { // build the arguments for quadraticCurveTo()
				var from = curve[i-1];
				return (i && Vector.intersectLines(
					from[0].minus(from[1]), from[0], to[0], to[0].plus(to[1])
				) || to[0]).toArray()
				.concat(to[0].toArray());
			});

			var lightmask = document.createElement('canvas'),
			lctx = lightmask.getContext('2d');
			lightmask.width = 3*canvas.width;
			lightmask.height = canvas.height;
			lctx.beginPath();
				lctx.moveTo(0,0);
				curve.forEach(function(coords) {
					lctx.quadraticCurveTo.apply(lctx, coords);
				});
				lctx.lineTo(lightmask.width, 0);
			lctx.closePath();
			lctx.fill();
			
			return function dawn(time) {
				// meh, this shouldn't draw the mask every time
				// but using position: absolute doesn't seem to be cheaper
				// perhaps draw the canvas on itself with an offset? Clever implementations could optimize for this
				// also: scrollLeft?
				var offset = Math.floor(((3600-43200-time)%86400)/86400*canvas.width)
				ctx.globalAlpha = 0.5;
				ctx.drawImage(lightmask, offset, 0);
				ctx.globalAlpha = 1;
			}
		})(),
		paint = function (queue) {
			queue.forEach(function (dots, i) {
				ctx.fillStyle = 'rgba(255,255,0,'+i/data.conf.queueLength+')';
				if (dots !== null)
					dots.forEach(drawdot);
			});
		},
		togglePlaying = function () {
			if (control.running) {
				ctx.save();
				ctx.fillStyle = 'rgba(0,0,0,0.5)';
				ctx.fillRect(width/2-100, height/2-100, 80, 200)
				ctx.fillRect(width/2+20, height/2-100, 80, 200)
				ctx.restore();
			}
			control.running = !control.running;
			control.tick.toggle();
		};
		control.tick = new Interval(function () {
			queue.push(data[timer] || null);
			if (queue.length >= data.conf.queueLength)
				queue.shift();
			canvas.width = width;
			dawn(timer);
			paint(queue);
			timer += data.conf.secondsPerInterval;
			//if (timer >= lastFrame)
			//	control.tick.stop();
			if (timer >= data.last)
				timer = data.first;
		}, data.conf.intervalMs).start();
		whenever(document.getElementById('canvas-container'), 'click').then(togglePlaying).run();
	})
	.accumulate(2),

	// go
	take = Function.constant;
	take(['img/worldmap.jpg']).then(loadingMsg.curry('images')).then(load).run()
		.then(loadingDone.curry('images')).then(prepareCanvas).then(processPosts.curry(1)).run();
	take([debugdata ? 'postdata-sample.json' : 'data/posts.json']).then(loadingMsg.curry('posts')).then(load).run()
		.then(loadingDone.curry('posts')).then(processPosts.curry(0)).run();
	// then(reset)?
}, false);

/* 
 * library functions
 * inspired by Arrowlets
 * http://www.cs.umd.edu/projects/PL/arrowlets/
 * here be evil globals (this will be cleaned up some time)
 */
// NOTE: memleaks?
// hmm http://lambdor.net/?p=81
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
					(path, callback.curry(i));
			});
		})
	}})
}
function whenever(el, eventType, useCapture) {
	return ({ then: function (callback) {
		return new Async(callback, function (callback) {
			el.addEventListener(eventType, callback, useCapture || false);
		})
	}})
}
// asynchronous pipe
// NOTE Async.prototype = new Function() -> Async()
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

// create a constant function
Function.constant = function (x) {
	return function () {
		return x
	}
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
// alias for f(), analogous to Async
Function.prototype.run = function () {
	return this.apply(this, Array.prototype.slice.apply(arguments))
}
// save the first arguments of a function (obvious)
// useful for assigning 'slots' when using accumulate
Function.prototype.curry = function () {
	var f = this,
	args = Array.prototype.slice.apply(arguments);
	return function () {
		return f.apply(this, args.concat(Array.prototype.slice.apply(arguments)))
	}
}
// Interval object, useful for pausing intervals
// no error handling, no cleverness
// the interval is passed as a parameter to f
function Interval(f, tick) {
	var interval,
	running = false,
	self = this;
	this.start = function start() {
		interval = window.setInterval(f.curry(self), tick);
		running = true;
		return self
	}
	this.pause = undefined; // unimplemented, requires saving the time
	this.stop = function stop() {
		window.clearInterval(interval);
		running = false;
		return self
	}
	this.toggle = function () {
		return running ? self.stop() : self.start();
	}
}
Array.init = function (l) {
	var arr = new Array(l);
	for (var i = 0; i < l; i++) {
		arr[i] = 0;
	}
	return arr
}
Object.extend = function (destination, source) {
	for (var property in source)
		destination[property] = source[property];
	return destination;
}
function Vector (coords) {
	var self = this;
	self.length = coords.length;
	coords.forEach(function (val, i) {
		self[i] = val;
	})
}
Vector.prototype = Object.extend([], {
	minus: function (b) {
		return new Vector(this.map(function (ai, i) {
			return ai - b[i]
		}))
	},
	plus: function (b) {
		return new Vector(this.map(function (ai, i) {
			return ai + b[i]
		}))
	},
	scalarLength: function () {
		return Math.sqrt(this.reduce(function (x, y, i) {
			return (i===1?x:1)*x + y*y
		}))
	},
	multiply: function (l) {
		return new Vector(this.map(function (x) {
			return x * l
		}))
	},
	normalize: function () {
		return this.multiply(1/this.scalarLength())
	},
	scalarproduct: function (b) {
		return this.reduce(function (sum, a, i) {
			return (i===1?sum*b[0]:sum) + a*b[i]
		})
	},
	angle: function (b) {
		return Math.acos(this.scalarproduct(b)/(this.scalarLength()*b.scalarLength()))
	},
	toArray: function () {
		return this.map(function (x) { return x })
	},
	toString: Object.prototype.toString
});
Vector.intersectLines = function (a, b, c, d) {
	var ab = b.minus(a),
	bc = c.minus(b),
	cd = d.minus(c);
	// Cramer's rule
	return Math.abs(ab[0]*cd[1]-ab[1]*cd[0]) > 0.001 &&
		b.plus(ab.multiply(
			(bc[0]*cd[1]-bc[1]*cd[0]) / (ab[0]*cd[1]-ab[1]*cd[0])
		))
}
