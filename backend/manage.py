import os
import sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
if len(sys.argv) == 2 and sys.argv[1] == 'runserver':
    sys.argv.append('127.0.0.1:8018')
from django.core.management import execute_from_command_line
execute_from_command_line(sys.argv)
