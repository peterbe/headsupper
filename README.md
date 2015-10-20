headsupper
==========

[![Build Status](https://travis-ci.org/peterbe/headsupper.svg?branch=master)](https://travis-ci.org/peterbe/headsupper)

[![Coverage Status](https://coveralls.io/repos/peterbe/headsupper/badge.svg?branch=master&service=github)](https://coveralls.io/github/peterbe/headsupper?branch=master)

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


Build the production bundle
---------------------------

This has nothing to do with Django. This is pure `npm`:

    npm run deploy

That'll create a `dist/bundle.js` monster with all the Javascript you
need.

Heroku
------

(These instructions are not maintained!)

1. heroku create
2. heroku config:set DEBUG=False ALLOWED_HOSTS=<foobar>.herokuapp.com, SECRET_KEY=something_secret
   DATABASE_URL gets populated by heroku once you setup a database.
3. git push heroku master
