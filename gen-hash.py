#!/usr/bin/env python3

import io
import hashlib
import base64
import sys
import pathlib
import re

from os.path import dirname
from itertools import chain


APPS = [
    f"{dirname(__file__)}/MailboxManager.mjs",
]

MODULES = [
    (f"{dirname(__file__)}/MailboxManager.mjs", "https://mailboxmanager.core.app.sobamail.com"),

    (f"{dirname(__file__)}/../soba-runtime/model/Base.mjs", "https://sobamail.com/schema/base/v1"),
    (f"{dirname(__file__)}/../soba-runtime/model/MailboxManagerEvent.mjs", "https://sobamail.com/schema/mailboxmanager/v1"),
    (f"{dirname(__file__)}/../soba-runtime/model/UserManagerEvent.mjs", "https://sobamail.com/schema/usermanager/v1"),
]



for fn, ns in MODULES:
    with io.open(fn, 'rb') as f:
        digest = hashlib.sha224(f.read()).digest()
        digest_b64 = base64.urlsafe_b64encode(digest).replace(b'=', b'').decode('ascii')
        digest_b32hex = base64.b32hexencode(digest).replace(b'=', b'').decode('ascii')

        io.open(fn + ".sha224.b64us", 'w').write('"')
        io.open(fn + ".sha224.b64us", 'a').write(digest_b64)
        io.open(fn + ".sha224.b64us", 'a').write('"')

        io.open(fn + ".sha224.b32hex", 'w').write('"')
        io.open(fn + ".sha224.b32hex", 'a').write(digest_b32hex)
        io.open(fn + ".sha224.b32hex", 'a').write('"')

        print(f"Wrote hashes of {fn}")

    for fnm in APPS:
        if fnm == fn:
            continue

        fdata = io.open(fnm, 'r', encoding='utf8').read()

        found = re.search(f'{ns}\\?sha224=[^"]+', fdata)
        if not found:
            continue

        oldval = found[0]
        newval = f'{ns}?sha224={digest_b64}'
        if oldval != newval:
            fdata = re.sub(f'{ns}\\?sha224=[^"]+', newval, fdata)
            io.open(fnm, 'w+', encoding='utf8').write(fdata)
            print("NEW file", fnm, "sub", ns)

        else:
            print("OLD file", fnm, "sub", ns)

    print("")
