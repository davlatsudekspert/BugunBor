#!/usr/bin/env python3
"""App Store Connect helper for the iOS workflow (.github/workflows/ios.yml).

  asc.py gate --bundle-id uz.bugunbor.app --min-build N [--register] [--sign-in-with-apple]
      Checks that the bundle id is registered (registers it with --register),
      turns on its Sign in with Apple capability (--sign-in-with-apple; the
      cloud-made profile carries the entitlement only then), checks that the App
      Store Connect app record uses it, then prints next_build =
      max(highest build already uploaded + 1, N) to $GITHUB_OUTPUT.
  asc.py write-p8 PATH
      Writes the API key as a .p8 file (mode 600) for xcodebuild.

Reads ASC_KEY_ID, ASC_ISSUER_ID and ASC_KEY_P8_BASE64 from the environment. The
key secret may hold the .p8 file itself, the file in base64, or only the key
body between the BEGIN/END lines. The key is never printed.
"""
import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.appstoreconnect.apple.com/v1'


def fail(message):
    print(f'::error::{message}')
    sys.exit(1)


def private_key_pem():
    raw = os.environ.get('ASC_KEY_P8_BASE64', '').lstrip('﻿').strip()
    if not raw:
        fail('ASC_KEY_P8_BASE64 is not set')
    if 'BEGIN PRIVATE KEY' in raw:
        return raw.replace('\\n', '\n')
    compact = ''.join(raw.split())
    try:
        decoded = base64.b64decode(compact, validate=True)
    except ValueError:
        fail('ASC_KEY_P8_BASE64 is neither a .p8 file nor base64')
    text = decoded.decode('utf-8', 'ignore')
    if 'BEGIN PRIVATE KEY' in text:
        return text
    body = base64.b64encode(decoded).decode()
    lines = [body[i:i + 64] for i in range(0, len(body), 64)]
    return '-----BEGIN PRIVATE KEY-----\n' + '\n'.join(lines) + '\n-----END PRIVATE KEY-----\n'


def token():
    import jwt  # PyJWT with cryptography

    key_id, issuer = os.environ.get('ASC_KEY_ID', '').strip(), os.environ.get('ASC_ISSUER_ID', '').strip()
    if not key_id or not issuer:
        fail('ASC_KEY_ID and ASC_ISSUER_ID must be set')
    now = int(time.time())
    return jwt.encode({'iss': issuer, 'iat': now, 'exp': now + 15 * 60, 'aud': 'appstoreconnect-v1'},
                      private_key_pem(), algorithm='ES256', headers={'kid': key_id, 'typ': 'JWT'})


def call(method, path, query=None, body=None, auth=None):
    url = f'{API}{path}' + (f'?{urllib.parse.urlencode(query)}' if query else '')
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method, headers={'Authorization': f'Bearer {auth}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read() or b'{}')
    except urllib.error.HTTPError as error:
        detail = ''
        try:
            errors = json.loads(error.read()).get('errors', [])
            detail = '; '.join(f"{e.get('title', '')}: {e.get('detail', '')}" for e in errors)
        except ValueError:
            pass
        fail(f'App Store Connect {method} {path}: HTTP {error.code} {detail}'.strip())


def ensure_sign_in_with_apple(bundle_resource_id, auth):
    capabilities = call('GET', f'/bundleIds/{bundle_resource_id}/bundleIdCapabilities', auth=auth).get('data', [])
    if any(c['attributes'].get('capabilityType') == 'APPLE_ID_AUTH' for c in capabilities):
        print('Sign in with Apple capability: on')
        return
    call('POST', '/bundleIdCapabilities', body={'data': {
        'type': 'bundleIdCapabilities',
        'attributes': {'capabilityType': 'APPLE_ID_AUTH', 'settings': [
            {'key': 'APPLE_ID_AUTH_APP_CONSENT', 'options': [{'key': 'PRIMARY_APP_CONSENT'}]}]},
        'relationships': {'bundleId': {'data': {'type': 'bundleIds', 'id': bundle_resource_id}}},
    }}, auth=auth)
    print('Sign in with Apple capability: turned on')


def gate(args):
    auth = token()
    found = call('GET', '/bundleIds', {'filter[identifier]': args.bundle_id, 'limit': 200}, auth=auth)
    bundle = next((b for b in found.get('data', []) if b['attributes']['identifier'] == args.bundle_id), None)
    if not bundle:
        if not args.register:
            fail(f'Bundle id {args.bundle_id} is not registered (run with --register, or add it in Certificates, Identifiers & Profiles)')
        bundle = call('POST', '/bundleIds', body={'data': {'type': 'bundleIds', 'attributes': {
            'identifier': args.bundle_id, 'name': args.name, 'platform': 'IOS'}}}, auth=auth)['data']
        print(f'Registered bundle id {args.bundle_id} ({args.name})')
    else:
        print(f'Bundle id {args.bundle_id}: registered')
    if args.sign_in_with_apple:
        ensure_sign_in_with_apple(bundle['id'], auth)

    apps = call('GET', '/apps', {'filter[bundleId]': args.bundle_id, 'limit': 10}, auth=auth).get('data', [])
    app = next((a for a in apps if a['attributes']['bundleId'] == args.bundle_id), None)
    if not app:
        fail(f'No App Store Connect app uses {args.bundle_id} yet. Create it once: App Store Connect → Apps → + → New App '
             f'(iOS, name "{args.name}", bundle id {args.bundle_id}, SKU {args.bundle_id}), then run this workflow again.')
    print(f"App record: {app['attributes']['name']}")

    builds = call('GET', '/builds', {'filter[app]': app['id'], 'sort': '-uploadedDate', 'limit': 50, 'fields[builds]': 'version'}, auth=auth)
    versions = [int(b['attributes']['version']) for b in builds.get('data', []) if str(b['attributes'].get('version', '')).isdigit()]
    next_build = max([args.min_build] + [v + 1 for v in versions])
    print(f'Highest build in App Store Connect: {max(versions) if versions else "none"}; next build: {next_build}')
    output = os.environ.get('GITHUB_OUTPUT')
    if output:
        with open(output, 'a', encoding='utf-8') as handle:
            handle.write(f'next_build={next_build}\n')


def write_p8(args):
    pem = private_key_pem()
    fd = os.open(args.path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as handle:
        handle.write(pem if pem.endswith('\n') else pem + '\n')
    print(f'API key written to {args.path}')


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest='command', required=True)
    g = commands.add_parser('gate')
    g.add_argument('--bundle-id', required=True)
    g.add_argument('--name', default='BugunBor')
    g.add_argument('--min-build', type=int, default=1)
    g.add_argument('--register', action='store_true')
    g.add_argument('--sign-in-with-apple', action='store_true')
    w = commands.add_parser('write-p8')
    w.add_argument('path')
    args = parser.parse_args()
    {'gate': gate, 'write-p8': write_p8}[args.command](args)


if __name__ == '__main__':
    main()
