var debug = true, log;
if (typeof console !== 'undefined' && debug)
	log = console.log;
else
	log = function () {};

document.addEventListener('DOMContentLoaded',function(){
	var intervalMs = 50,
	secondsPerInterval = 60,

	prepareCanvas = function prepareCanvas(loadEvent) {
		var background = loadEvent.target;
		canvas.width = background.width;
		canvas.height = background.height;
	},
	processPosts = (function processPosts(response) {
		if (response.status !== 200 && response.status !== 304) {
			log("oops, HTTP " + response.status);
			return
		} else {
			log("found, HTTP " + response.status)
		}
		return JSON.parse(response.text)
	})
	.then(function animatePosts(data) {
		log("animating...");
		var width = canvas.width,
		height = canvas.height;
		
		ctx.fillStyle = '#FFFFFF';
		data.posts.forEach(function(post){
			animatePost(
				(180+post.longitude)%360*width/360,
				(90-post.latitude)*height/180);
		});
		// animationQueue
		// zeittabelle
		// tabelle durchlaufen (setInterval), an animationQueue anhängen
		// gleichzeitig animationQueue abarbeiten, setTimeout
		// oder einfach losanimieren
	})
	.twice(),
	animatePost = function animatePost(longitudepx, latitudepx) {
		ctx.beginPath();
		ctx.arc(longitudepx, latitudepx, 10, 0, Math.PI*2, true); 
		ctx.closePath();
		ctx.fill();
		// fade out
		// destroy
	},
	
	canvas = document.getElementById('vis'),
	ctx = canvas.getContext('2d');

	// go
	load('worldmap.png').then(prepareCanvas).then(processPosts).run();
	load(debug ? 'postdata-sample.json' : 'postdata.json').then(processPosts).run();
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
					text: req.responseText,
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
		// accumulate the arguments
		args = Array.prototype.concat.apply(args, arguments).filter(function (x) {
				return typeof x !== 'undefined'
		});
		if (++alreadycalled < 2) return;
		else return f.apply(f, args);
	}
}
Function.prototype.run = function () { // f.run() alias for f()
	return this.apply(this, Array.prototype.slice.apply(arguments));
}
