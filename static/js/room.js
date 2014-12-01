var editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
	    mode: "python",
	    lineNumbers: true,
		theme: "solarized dark",
		keyMap: "sublime",
		matchBrackets: true,
		showCursorWhenSelecting: true
});

$(document).ready(function(){
	$('#console').val('');
	$('#q-a').val('');

	function input_socketio_console(msg) {
		text = $('#socketio-console').val();
		if (text.length !== 0) {
			text += '\n' + msg.log;
		} else {
			text = msg.log;
		}
		$('#socketio-console').val(text);
		var psconsole = $('#socketio-console');
		psconsole.scrollTop(
			psconsole[0].scrollHeight - psconsole.height()
		); 
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
		if (msg.result < 0) {
			input_socketio_console({'log': '[' + msg.user + '] : 遊び中'})
		} else if (msg.result == 0) {
			input_socketio_console({'log': '[' + msg.user + '] : Failure...'})
		} else {
			input_socketio_console({'log': '[' + msg.user + '] : Solved!!'})
		}
		$('#user-list').empty();
		for (var i = 0; i < msg.users.length; i++) {
			console.log(msg.users[i]);
			$('#user-list').append('<li>' + msg.users[i] + ' : Sushi is <span id=' + msg.users[i] + '>' + msg.points[i] + '</span></li>');
		}
	});

	socket.on('success join room', function(msg) {
		console.log(msg);
		input_socketio_console(msg);
		// TODO: msg('users') => #user-list (clear->append)
		$('#user-list').empty();
		for (var i = 0; i < msg.users.length; i++) {
			console.log(msg.users[i]);
			$('#user-list').append('<li>' + msg.users[i] + ' : point = <span id=' + msg.users[i] + '>' + msg.points[i] + '</span></li>');
		}
	});

	socket.on('quest update', function(msg) {
		$('#q-q').text(msg.q);
		$('#q-a').val(msg.a);
		$('#q-id').text(msg.id);
	});

	$('#q-next').click(function(){
		if ($("#user").text() != 'yano') {
			return;
		}
		var path = location.pathname.split('/');
		socket.emit('quest next', {'n': parseInt($('#q-id').text()) + 1, 'room': path[path.length-1]});
	});

	$('#q-prev').click(function(){
		if ($("#user").text() != 'yano') {
			return;
		}
		var path = location.pathname.split('/');
		socket.emit('quest prev', {'n': parseInt($('#q-id').text()) - 1, 'room': path[path.length-1]});
	});

	$('#run-code').click(function(){
		$('#run-code').attr('disabled', true);
		var lang = $('#visibleValue').html();
		var code = editor.getValue();
		var path = location.pathname.split('/');
		var data = {
			'user': $("#user").text(),
			'room': path[path.length-1],
			'lang': lang,
			'code': code,
			'q-id': parseInt($('#q-id').text())
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
				$('#run-code').removeAttr('disabled');
			},
			error: function() {
				$('#console').val('');
				$('#console').val('>>> AJAX POST ERROR... orz <<<');
				$('#run-code').removeAttr('disabled');
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

	$('#vimvimvim').click(function() {
		if($(this).hasClass('btn-danger')) {
			$(this).removeClass('btn-danger');
			editor.setOption('keyMap', "sublime");
		} else {
			$(this).addClass('btn-danger');
			editor.setOption('keyMap', 'vim');
		}
	});
});
