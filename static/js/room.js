$(document).ready(function(){
	//
	// SocketIO event
	//
	var socket = io.connect('http://' + document.domain + ':' + location.port);

	socket.on('connect', function() {
		var path = location.pathname.split('/');
		socket.emit('success_connect', {room: path[path.length-1]});
	});

	socket.on('memo response', function(msg) {
	});

	socket.on('success join room', function(msg) {
		console.log(msg);
	});
});
