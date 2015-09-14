#!/usr/bin/env python

"""
Debugging tool to re-send a saved JSON dump
"""

import os
import requests


def run(filepath):
    payload = open(filepath).read()
    filename = os.path.basename(filepath)
    sans = os.path.splitext(filename)[0]

    __, signature = sans.split('__')
    if not signature.startswith('sha1='):
        signature = 'sha1=' + signature

    url = 'http://localhost:8000/'
    response = requests.post(
        url,
        data=payload,
        headers={'X-Hub-Signature': signature}
    )
    print response.status_code
    print response.content


if __name__ == '__main__':
    import sys, os
    args = sys.argv[1:]
    if not args or (args and not os.path.isfile(args[0])):
        print "python %s /path/to/saved/1234.0__signature.json" % __file__
        sys.exit(1)

    sys.exit(run(args[0]))
