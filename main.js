document.addEventListener('DOMContentLoaded',function(){
	var canvas = document.getElementById('vis'),
	ctx = canvas.getContext('2d'),

	processPosts = (function () {
		console.log("processing...");
		console.log(arguments);
		return "done";
		//bla...
	}).twice()
	.then(animatePosts);
	
	function drawMap(loadEvent) {
		var background = loadEvent.target;
		canvas.width = background.width;
		canvas.height = background.height;
		ctx.drawImage(background, 0, 0);
	}

	function animatePosts(data) {
		// animationQueue
		// zeittabelle
		// tabelle durchlaufen (setInterval), an animationQueue anhängen
		// gleichzeitig animationQueue abarbeiten, setTimeout
		// oder einfach losanimieren
	}

	function animatePost(latitude, longitude) {
		// paint pixel
		// fade out
		// destroy
	}

	// go
	load('worldmap.png').then(drawMap).then(processPosts).run();
	load('postdata.json').then(processPosts).run();
	// then(reset)?
}, false);

/* 
 * library functions
 * inspired by Arrowlets
 * http://www.cs.umd.edu/projects/PL/arrowlets/
 */
// asynchronous loading of content, starting a pipe
function load(path) {
	function loadImage(callback) {
		var img = document.createElement('img');
		img.addEventListener('load', callback, false);
		img.src = path;
	}
	function loadResource(callback) {
		var req = new XMLHttpRequest();
		req.open('GET', path, true);
		req.onreadystatechange = function () {
			if (req.readyState === 4) {
				callback({
					responseText: req.responseText,
					status: req.status
				})
			}
		};
		req.send(null);
	}
	return ({ then: function (callback) {
		return new Async(callback, /\.(png|jpg|gif)$/.test(path) ? loadImage : loadResource)
	}})
}
// asynchronous pipe
function Async (fun, hook) {
	this.fun = fun;
	this.hook = hook;
}
Async.prototype.then = function (fun) {
	// some crocheting
	return new Async(Function.prototype.then.call(this.fun, fun), this.hook)
}
Async.prototype.run = function () {
	return this.hook(this.fun);
}

// synchronous pipe
Function.prototype.then = function (g) {
	var f = this;
	return function () {
		var x = Array.prototype.slice.apply(arguments);
		return g(f.apply(f, x))
	}
}
// defer the first function call, wait for the next one
Function.prototype.twice = function () {
	var alreadycalled = 0,
	args = [],
	f = this;
	return function() {
		args = Array.prototype.concat.apply(args, arguments)
			.filter(function (x) { return typeof x !== 'undefined'}); // accumulate the arguments
		if (++alreadycalled < 2) return;
		else return f.apply(f, args);
	}
}
Function.prototype.run = function () { // f.run() alias for f()
	return this.apply(this, Array.prototype.slice.apply(arguments));
}
