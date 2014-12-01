var editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
	    mode: "python",
	    lineNumbers: true,
		theme: "solarized dark"
});

$(document).ready(function(){
	$('#console').val('');

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
		input_socketio_console({'log': msg.user + ': result => ' + msg.result})
	});

	socket.on('success join room', function(msg) {
		console.log(msg);
		input_socketio_console(msg);
		// TODO: msg('users') => #user-list (clear->append)
		$('#user-list').empty();
		for (var i = 0; i < msg.users.length; i++) {
			console.log(msg.users[i]);
			$('#user-list').append('<li>' + msg.users[i] + '</li>');
		}
	});

	$('#run-code').click(function(){
		var lang = $('#visibleValue').html();
		var code = editor.getValue();
		var path = location.pathname.split('/');
		var data = {
			'user': $("#user").text(),
			'room': path[path.length-1],
			'lang': lang,
			'code': code
		};
		$.ajax({
			url: '/run',
			type: 'post',
			data: JSON.stringify(data),
			contentType: 'application/json',
			success: function(json) {
				res = $.parseJSON(json);
				$('#console').val('');
				$('#console').val(res.output);
				socket.emit('run end', {'user': res.user, 'result': res.result, 'room': res.room});
			},
			error: function() {
				$('#console').val('');
				$('#console').val('>>> AJAX POST ERROR... orz <<<');
			}
		});
	});

	$('.dropdown-menu a').click(function(){
		var visibleTag = $(this).parents('ul').attr('visibleTag');
		var hiddenTag = $(this).parents('ul').attr('hiddenTag');
		var value = $(this).attr('value');
		$(visibleTag).html(value);
		$(hiddenTag).val(value);
		if (value == "c") {
			value = "text/x-csrc";
		}
		else if (value == "c++") {
			value = "text/x-c++src";
		}
		editor.setOption("mode", value);
	});
});
