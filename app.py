# -*- encoding: utf-8 -*-

import json
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
    users = Room.query.filter_by(name=g.user.room).first().users
    return render_template('room.html', **locals())




@socketio.on('connect')
def connect():
    print('Client connected')

@socketio.on('disconnect')
def disconnect():
    print('Client disconnected')

@socketio.on('success_connect')
def success_connect(msg):
    print(msg['room'])
    join_room(msg['room'])
    emit('success join room',
         {'log': 'Successed join room => ' + msg['room']},
         room = msg['room'])




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




if __name__ == '__main__':
    from gevent import monkey
    monkey.patch_all()
    socketio.run(app)
