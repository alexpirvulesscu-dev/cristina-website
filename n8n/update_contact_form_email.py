"""Updates the designed email in the EXISTING n8n workflow "Cristina — Contact form".
   Run it from the n8n/ folder of this project:
     python3 update_contact_form_email.py            CHECK ONLY: shows what would change, changes NOTHING
     python3 update_contact_form_email.py --apply    changes the two steps in your n8n
 It changes ONLY two steps, using the text saved in cristina-contact-form.json:
   1. "Check and tidy"              (the code that prepares the email text)
   2. "Send to Cristina's inbox"    (subject, email type HTML, and the email design)
 Everything else stays as it is in n8n: the Gmail login, the webhook, the other steps, on/off state.
 The n8n key is read from the same key file as create_contact_form.py and is never printed.
"""
import json, os, sys, urllib.request, urllib.error

ARGS = sys.argv[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(HERE, 'cristina-contact-form.json')
DEFAULT_KEYFILE = os.path.expanduser('~/projects/all-pnl-apps/' + '.' + 'env')
DEFAULT_URL = 'https://alexpirvulescu.app.n8n.cloud'
GMAIL = 'n8n-nodes-base.gmail'


def opt(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS and ARGS.index(name) + 1 < len(ARGS) else default


# what we want, from the saved workflow file
want = json.load(open(FILE, encoding='utf-8'))
want_code = next(n for n in want['nodes'] if n['name'] == 'Check and tidy')['parameters']['jsCode']
want_gmail = next(n for n in want['nodes'] if n['type'] == GMAIL)['parameters']
WANT_GMAIL = {k: want_gmail[k] for k in ('subject', 'emailType', 'message')}

# the key (never printed)
env = {}
keyfile = os.path.expanduser(opt('--env', DEFAULT_KEYFILE))
if os.path.exists(keyfile):
    for line in open(keyfile, encoding='utf-8'):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
elif not os.environ.get('N8N_API_KEY_WRITE'):
    sys.exit('STOP: no key found. Set N8N_API_KEY_WRITE in your Terminal, or use --env /path/to/key/file')
key = os.environ.get('N8N_API_KEY_WRITE') or env.get('N8N_API_KEY_WRITE') or env.get('N8N_API_KEY')
if not key:
    sys.exit('STOP: no N8N_API_KEY_WRITE in the key file.')
base = (opt('--url') or env.get('N8N_BASE_URL') or env.get('N8N_URL') or DEFAULT_URL).rstrip('/')
if base.endswith('/api/v1'):
    base = base[:-7]


def call(method, path, body=None):
    req = urllib.request.Request(base + '/api/v1' + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={'X-N8N-API-KEY': key, 'Content-Type': 'application/json', 'Accept': 'application/json',
                                          'User-Agent': 'cristina-website-setup/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit('STOP: n8n answered %s %s. Nothing was changed.' % (e.code, e.reason))
    except urllib.error.URLError as e:
        sys.exit('STOP: could not reach %s (%s). Nothing was changed.' % (base, e.reason))


print('n8n address:', base)
items = call('GET', '/workflows?limit=250').get('data', [])
found = [w for w in items if w.get('name') == want['name']]
if len(found) != 1:
    sys.exit('STOP: expected exactly one workflow called "%s", found %d. Nothing was changed.' % (want['name'], len(found)))
wf = call('GET', '/workflows/' + found[0]['id'])
print('Found "%s" (id %s, active: %s)' % (wf['name'], wf['id'], wf.get('active')))

changes = []
for n in wf['nodes']:
    if n['name'] == 'Check and tidy':
        if n['parameters'].get('jsCode') != want_code:
            n['parameters']['jsCode'] = want_code
            changes.append('"Check and tidy": code step updated')
    elif n['type'] == GMAIL:
        for k, v in WANT_GMAIL.items():
            if n['parameters'].get(k) != v:
                n['parameters'][k] = v
                changes.append('"%s": %s updated' % (n['name'], k))

if not changes:
    print('Already up to date. Nothing to change.')
    sys.exit(0)
print('Would change:')
for c in changes:
    print('  -', c)
print('Everything else (Gmail login, webhook, other steps) is left exactly as it is.')

if '--apply' not in ARGS:
    print('\nCHECK ONLY. Nothing was changed. Run again with --apply to make the change.')
    sys.exit(0)

# only the fields the n8n API accepts on update
body = {'name': wf['name'], 'nodes': wf['nodes'], 'connections': wf['connections'], 'settings': wf.get('settings', {})}
call('PUT', '/workflows/' + wf['id'], body)
after = call('GET', '/workflows/' + wf['id'])
ok = (next(n for n in after['nodes'] if n['name'] == 'Check and tidy')['parameters']['jsCode'] == want_code and
      all(next(n for n in after['nodes'] if n['type'] == GMAIL)['parameters'].get(k) == v for k, v in WANT_GMAIL.items()))
print('\nDONE. Re-read from n8n to confirm: %s. Workflow active: %s' % ('matches' if ok else 'DOES NOT MATCH, check n8n', after.get('active')))
