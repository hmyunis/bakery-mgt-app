"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
import pymysql

# This creates the "MySQLdb" alias in Python's memory
pymysql.install_as_MySQLdb()

# Now we import that alias so we can change its version setting
import MySQLdb

# We overwrite the version to trick Django (2.2.2 is safe)
if MySQLdb.version_info < (2, 2, 2):
    MySQLdb.version_info = (2, 2, 2, 'final', 0)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
