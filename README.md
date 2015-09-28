headsupper
==========

[![Build Status](https://travis-ci.org/peterbe/headsupper.svg?branch=master)](https://travis-ci.org/peterbe/headsupper)

[![Coverage status](https://img.shields.io/coveralls/peterbe/headsupper/master.svg)](https://coveralls.io/r/peterbe/headsupper)

Run the tests
-------------

To run the tests first install `mock` (`pip install mock`) then run:

    python manage.py test

If you want to run the full suite, with flake8 and coverage, you may use
[tox](https://testrun.org/tox/latest/). This will run the tests the same way
they are run by [travis](https://travis-ci.org)):

    pip install tox
    tox

The `.travis.yml` file will also run [coveralls](https://coveralls.io) by
default.

If you want to benefit from Travis and Coveralls, you will need to activate
them both for your project.

Oh, and you might want to change the "Build Status" and "Coverage Status" links
at the top of this file to point to your own travis and coveralls accounts.


Docker for development
----------------------

0. Make sure you have [docker](https://docker.io) and [docker-compose](https://github.com/docker/compose)
1. docker-compose up


Docker for deploying to production
-----------------------------------

1. Add your project in [Docker Registry](https://registry.hub.docker.com/) as [Automated Build](http://docs.docker.com/docker-hub/builds/)
2. Prepare a 'env' file with all the variables needed by dev, stage or production.
3. Run the image:

    docker run --env-file env -p 80:8000 peterbe/headsupper

Heroku
------
1. heroku create
2. heroku config:set DEBUG=False ALLOWED_HOSTS=<foobar>.herokuapp.com, SECRET_KEY=something_secret
   DATABASE_URL gets populated by heroku once you setup a database.
3. git push heroku master
