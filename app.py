# -*- encoding: utf-8 -*-

import os
import json
import yaml
import subprocess
from functools import wraps
from flask import Flask, render_template, session, g, \
                  request, redirect, url_for, flash
from flask.ext.socketio import SocketIO, emit, send, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config.from_object('config')
socketio = SocketIO(app)
db = SQLAlchemy(app)
db_session = db.session

@app.before_request
def load_current_user():
    g.user = User.query.get(session['user_id']) \
        if 'user_id' in session else None

@app.teardown_request
def remove_db_session(exception):
    db_session.remove()

@app.route('/join', methods=['POST'])
def join():
    if request.method == 'POST':
        user, room = insert_user(request.form['name'], request.form['room'])
        if user:
            session['user_id'] = user.id
            g.user = user
            return redirect(url_for('room', name=room.name))
    return None

@app.route('/joinout')
def joinout():
    session.pop('user_id', None)
    return redirect(url_for('index'))

@app.route('/')
def index():
    rooms = Room.query.all()
    return render_template('index.html', **locals())

@app.route('/room/<name>')
def room(name):
    user = g.user
    return render_template('room.html', **locals())




@socketio.on('connect')
def connect():
    print('Client connected')

@socketio.on('disconnect')
def disconnect():
    print('Client disconnected')

@socketio.on('success_connect')
def success_connect(msg):
    #print(msg['room'])
    #print(msg['user'])
    users_obj = Room.query.filter_by(name=msg['room']).first().users
    join_room(msg['room'])
    emit('success join room',
         {'log': '[' + msg['user'] + '] : Joined room => ' + msg['room'],
          'users': [u.name for u in users_obj],
          'points': [u.point for u in users_obj]},
         room = msg['room'])

@socketio.on('run end')
def run_end(msg):
    users_obj = Room.query.filter_by(name=msg['room']).first().users
    emit('run response',
         {'result': msg['result'], 'user': msg['user'],
          'users': [u.name for u in users_obj],
          'points': [u.point for u in users_obj]},
         room = msg['room'])

@socketio.on('quest next')
def quest_next(msg):
    l = len(Quest.query.all())
    n = int(msg['n'])
    if l < n:
        return
    q = Quest.query.get(n)
    emit('quest update',
         {'q': q.q, 'a': q.a, 'id': q.id},
         room = msg['room'])

@socketio.on('quest prev')
def quest_next(msg):
    n = int(msg['n'])
    if n < 1:
        return
    q = Quest.query.get(n)
    emit('quest update',
         {'q': q.q, 'a': q.a, 'id': q.id},
         room = msg['room'])

@app.route('/run', methods=['POST'])
def run_code():
    msg = request.json
    #print(msg['room'])
    #print(msg['user'])
    #print(msg['lang'])
    #print(msg['code'])
    cmd = ""
    if msg['lang'] == 'python':
        cmd = 'python'
        ext = '.py'
    elif msg['lang'] == 'ruby':
        cmd = 'ruby'
        ext = '.rb'
    elif msg['lang'] == 'javascript':
        cmd = 'node'
        ext = '.js'
    elif msg['lang'] == 'go':
        cmd = 'go build -o ' + 'tmp/' + msg['user']
        ext = '.go'
    elif msg['lang'] == 'c':
        cmd = 'gcc -o ' + 'tmp/' + msg['user']
        ext = '.c'
    elif msg['lang'] == 'c++':
        cmd = 'g++ -o ' + 'tmp/' + msg['user']
        ext = '.cpp'

    filename = 'tmp/' + msg['user'] + ext;
    with open(filename, 'w') as f:
        f.write(msg['code'])

    cwd = "."
    cmdline = cmd + ' ' + filename
    if msg['lang'] == 'go' or msg['lang'] == 'c' or msg['lang'] == 'c++':
        cmdline += '&& ./'  + 'tmp/' + msg['user']
    #print(cmdline)
    p = subprocess.Popen(cmdline, shell=True,
                         cwd=cwd,
                         stdin=subprocess.PIPE,
                         stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT,
                         close_fds=True)
    (stdout, stdin) = (p.stdout, p.stdin)

    answer = stdout.read()
    result = -1
    if msg['q-id'] > 0:
        q = Quest.query.get(msg['q-id'])
        print(answer)
        print(q.a)
        if q.a.rstrip() == answer.rstrip():
            result = 1
            u = User.query.filter_by(name=msg['user']).first()
            u.point += 1
            db_session.commit()
        else:
            result = 0

    return json.dumps({'output': answer, 'result': result,
        'user': msg['user'], 'room': msg['room']})




class Quest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    q = db.Column(db.Text)
    a = db.Column(db.Text)
    
    def __init__(self, q, a):
        self.q = q
        self.a = a

class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    users = db.relationship('User', backref='user')

    def __init__(self, name):
        self.name = name

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    point = db.Column(db.Integer)
    room = db.Column(db.String(50), db.ForeignKey('room.name'))

    def __init__(self, name, room):
        self.name = name
        self.room = room
        self.point = 0

def init_db():
    db.create_all()

def insert_user(name, room):
    r = Room.query.filter_by(name=room).first()
    if not r:
        r = Room(room)
        db.session.add(r)
        db.session.commit()

    u = User.query.filter_by(name=name).first()
    if not u:
        u = User(name, room)
        db.session.add(u)
        db.session.commit()

    return u, r

def add_quest(file):
    with open(file, 'r') as f:
        data = yaml.load(f)
        q = Quest(data['q'], data['a'])
        db_session.add(q)
        db_session.commit()

def delete_quest():
    qs = Quest.query.all()
    for q in qs:
        db_session.delete(q)
        db_session.commit()

if __name__ == '__main__':
    from gevent import monkey
    monkey.patch_all()
    socketio.run(app, host="192.168.5.44")
