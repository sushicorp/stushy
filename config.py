'''
Configure for Flask(web/)

* session secret key
* database uri
'''

import os

_basedir = os.path.abspath(os.path.dirname(__file__))

SECRET_KEY = os.environ['SECRET_KEY'] \
    if 'SECRET_KEY' in os.environ else 'dev key'

SQLALCHEMY_DATABASE_URI = os.environ['DATABASE_URI'] \
    if 'DATABASE_URI' in os.environ else \
    'sqlite:///sushi.db'

DEBUG = True

del os
