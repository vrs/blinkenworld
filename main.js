document.addEventListener('DOMContentLoaded', function (){
	var debug = true,
	log = function log(x) {
		if (typeof console !== 'undefined' && debug)
			console.log(x)
	},
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
			log("found, HTTP " + response.status);
		}

		var raw = JSON.parse(response.text),
		roundDown = function (x) {
			return x-x%raw.conf.secondsPerInterval
		},
		// assume the data is in order
		preparedPosts = {
			first: roundDown(raw.posts[0].time),
			last: roundDown(raw.posts[raw.posts.length-1].time),
			conf: raw.conf
		};
		raw.posts.forEach(function (post) {
			var time = roundDown(post.time);
			if (!(time in preparedPosts))
				preparedPosts[time] = [];
			preparedPosts[time].push({
				longitude: post.longitude,
				latitude: post.latitude
			})
		});
		log(preparedPosts);
				
		return preparedPosts
	})
	.then(function animatePosts(data) {
		log("animating...");
		var width = canvas.width,
		height = canvas.height;
		
		ctx.fillStyle = '#FFFFFF';
		for (var groupname in data) {
			// assume nobody prototypes properties with numeric keys
			if (!isNaN(parseInt(groupname,10)))
				data[groupname].forEach(function (post) {
					animatePost((180+post.longitude)%360*width/360,
						(90-post.latitude)*height/180,
						data.conf.dotSize)
				})
		}
		// TODO animationQueue
	})
	.twice(),
	animatePost = function animatePost(longitudepx, latitudepx, dotSize) {
		ctx.beginPath();
		ctx.arc(longitudepx, latitudepx, dotSize/2, 0, Math.PI*2, true); 
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
			if (req.readyState === 4)
				callback({
					text: req.responseText,
					status: req.status
				});
		};
		req.send(null);
	}
	return ({ then: function (callback) {
		return new Async(callback, /\.(png|jpg|gif)$/.test(path) ? loadImage : loadResource)
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
		var x = Array.prototype.slice.apply(arguments);
		return g(f.apply(f, x))
	}
}
// defer the first function call, wait for the next one
Function.prototype.twice = function () {
	var alreadycalled = 0,
	args = [],
	f = this;
	return function () {
		// accumulate the arguments
		args = Array.prototype.concat.apply(args, arguments).filter(function (x) {
				return typeof x !== 'undefined'
		});
		if (++alreadycalled < 2)
			return
		else
			return f.apply(f, args)
	}
}
Function.prototype.run = function () { // f.run() alias for f()
	return this.apply(this, Array.prototype.slice.apply(arguments))
}
