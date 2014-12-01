var editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
	    mode: "python",
	    lineNumbers: true,
		theme: "solarized dark"
});

$(document).ready(function(){
	function input_socketio_console(msg) {
		text = $('#socketio-console').val();
		if (text.length !== 0) {
			text += '\n' + msg.log;
		} else {
			text = msg.log;
		}
		$('#socketio-console').val(text);
	}
	//
	// SocketIO event
	//
	var socket = io.connect('http://' + document.domain + ':' + location.port);

	socket.on('connect', function() {
		$('#socketio-console').val('');
		var path = location.pathname.split('/');
		user = $("#user").text();
		socket.emit('success_connect', {'room': path[path.length-1], 'user': user});
	});

	socket.on('run response', function(msg) {
		console.log(msg.result);
		console.log(msg.user);
		console.log(msg.output);
		$('#console').val('');
		$('#console').val(msg.output);
	});

	socket.on('success join room', function(msg) {
		console.log(msg);
		input_socketio_console(msg);
		// TODO: msg('users') => #user-list (clear->append)
	});

	$('#run-code').click(function(){
		var lang = $('#visibleValue').html();
		var code = editor.getValue();
		var path = location.pathname.split('/');
		socket.emit('run code', {
			'user': $("#user").text(),
			'room': path[path.length-1],
			'lang': lang,
			'code': code
		});
	});

	$('.dropdown-menu a').click(function(){
		var visibleTag = $(this).parents('ul').attr('visibleTag');
		var hiddenTag = $(this).parents('ul').attr('hiddenTag');
		var value = $(this).attr('value');
		$(visibleTag).html(value);
		$(hiddenTag).val(value);
		if (value == "c" || value == "c++") {
			value = "clike";
		}
		editor.setOption("mode", value);
	});
});
