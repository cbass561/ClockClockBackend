/*
 * Server.js
 * 
 * The main portion of this project. Contains all the defined routes for express,
 * rules for the websockets, and rules for the MQTT broker.
 * 
 * Refer to the portions surrounded by --- for points of interest
 */
var express   = require('express'),
	app       = express();
var pug       = require('pug');
var sockets   = require('socket.io');
var path      = require('path');

var conf      = require(path.join(__dirname, 'config'));
var internals = require(path.join(__dirname, 'internals'));

var server = require('http').createServer(app);
var io = sockets(server);
var regionCounter = [0,0,0,0];
var localMQTT;

// -- Setup the application
setupExpress();
setupSocket();


// -- Socket Handler
// Here is where you should handle socket/mqtt events
// The mqtt object should allow you to interface with the MQTT broker through 
// events. Refer to the documentation for more info 
// -> https://github.com/mcollina/mosca/wiki/Mosca-basic-usage
// ----------------------------------------------------------------------------
function socket_handler(socket, mqtt) {
	localMQTT = mqtt;
	// Called when a client connects
	mqtt.on('clientConnected', client => {
		
		socket.emit('debug', {
			type: 'CLIENT', msg: 'New client connected: ' + client.id
		});
	});

	// Called when a client disconnects
	mqtt.on('clientDisconnected', client => {
		socket.emit('debug', {
			type: 'CLIENT', msg: 'Client "' + client.id + '" has disconnected'
		});
	});

	// Called when a client publishes data
	mqtt.on('published', (data, client) => {
		if (!client) return;
		// since there is only one topic, everytime something is published we will incremenent the counter of region 1
		regionCounter[0]++;
		socket.emit('debug', {
			type: 'PUBLISH', 
			msg: 'Client "' + client.id + '" published "' + JSON.stringify(data) + '"'
		});
	});

	// Called when a client subscribes
	mqtt.on('subscribed', (topic, client) => {
		if (!client) return;

		socket.emit('debug', {
			type: 'SUBSCRIBE',
			msg: 'Client "' + client.id + '" subscribed to "' + topic + '"'
		});
	});

	// Called when a client unsubscribes
	mqtt.on('unsubscribed', (topic, client) => {
		if (!client) return;

		socket.emit('debug', {
			type: 'SUBSCRIBE',
			msg: 'Client "' + client.id + '" unsubscribed from "' + topic + '"'
		});
	});


}
// ----------------------------------------------------------------------------


// Helper functions
function setupExpress() {
	app.set('view engine', 'pug'); // Set express to use pug for rendering HTML

	// Setup the 'public' folder to be statically accessable
	var publicDir = path.join(__dirname, 'public');
	app.use(express.static(publicDir));

	// Setup the paths (Insert any other needed paths here)
	// ------------------------------------------------------------------------
	// Home page
	app.get('/', (req, res) => {
		res.render('index', {title: 'MQTT Tracker'});
	});

	app.post('/enter/:id/', (req, res) => {
		if(req.params.id > 0 && req.params.id <=4){
			regionCounter[req.params.id-1]++;
			io.sockets.emit('entered-region', {region:req.params.id, count:regionCounter[req.params.id - 1]});
			res.status(200).send('entered-region-'+req.params.id);
			console.log(regionCounter);
		}
	});

	app.post('/leave/:id/', (req, res) => {
		if(req.params.id > 0 && req.params.id <=4){
			regionCounter[req.params.id-1]--;
			io.sockets.emit('leave-region', {region:req.params.id, count:regionCounter[req.params.id - 1]});
			res.status(200).send('leave-region-'+req.params.id);
			console.log(regionCounter);
		}
	});

	// Basic 404 Page
	app.use((req, res, next) => {
		var err = {
			stack: {},
			status: 404,
			message: "Error 404: Page Not Found '" + req.path + "'"
		};

		// Pass the error to the error handler below
		next(err);
	});

	// Error handler
	app.use((err, req, res, next) => {
		console.log("Error found: ", err);
		res.status(err.status || 500);

		res.render('error', {title: 'Error', error: err.message});
	});
	// ------------------------------------------------------------------------

	// Handle killing the server
	process.on('SIGINT', () => {
		internals.stop();
		process.kill(process.pid);
	});
}

function setupSocket() {
	// Setup the internals
	internals.start(mqtt => {
		io.on('connection', socket => {
			socket_handler(socket, mqtt)
		});
	});

	server.listen(conf.PORT, conf.HOST, () => { 
		console.log("Listening on: " + conf.HOST + ":" + conf.PORT);
	});
}

function updateCounters(position){
	// if(position === 5){
	// 	var message = {
 //  			topic: 'MobileComputingRestrepo',
 //  			payload: '1', // or a Buffer
 //  			qos: 0, // 0, 1, or 2
 //  			retain: false // or true
	// 	};

	// 	localMQTT.publish(message, function() {
 //  			console.log('done!');
	// 	});
	// }

}