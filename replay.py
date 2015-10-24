#!/usr/bin/env python

"""
Debugging tool to re-send a saved JSON dump
"""

import os
import hashlib
import hmac

import requests


def run(filepath, secret):
    payload = open(filepath).read()

    signature = 'sha1=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha1
    ).hexdigest()

    url = 'http://localhost:8000/'
    response = requests.post(
        url,
        data=payload,
        headers={'X-Hub-Signature': signature}
    )
    print response.status_code
    print response.content


if __name__ == '__main__':
    import sys
    args = sys.argv[1:]
    if len(args) != 2 or (len(args) == 2 and not os.path.isfile(args[0])):
        print "python %s /path/to/saved/1234.0.json secret" % __file__
        sys.exit(1)

    sys.exit(run(args[0], args[1]))
