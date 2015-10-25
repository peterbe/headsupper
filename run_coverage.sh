#!/bin/bash
coverage run manage.py test --noinput
coverage report
coverage html
echo "open htmlcov/index.html ?"
