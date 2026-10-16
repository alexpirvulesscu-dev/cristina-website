"""Creates the "Cristina — Contact form" workflow in the n8n account (alexpirvulescu.app.n8n.cloud).
   Run it from the n8n/ folder of this project:
     python3 create_contact_form.py              CHECK ONLY: validates the file, looks at your n8n, changes NOTHING
     python3 create_contact_form.py --apply      creates the workflow (switched OFF) in your n8n
     python3 create_contact_form.py --selftest   no network: checks the workflow file is well formed
 It only ever ADDS one new workflow. It never edits or deletes anything that already exists in your n8n,
 and it refuses to create a second copy if one with the same name is already there.
 The workflow is created switched OFF, because the Gmail step needs you to pick the sending account first.
 The n8n key is read from a key file and is never printed. By default it uses the P&L apps' key file:
   ~/projects/all-pnl-apps/  (the hidden key file there; N8N_API_KEY_WRITE and N8N_BASE_URL or N8N_URL)
 Use --env /other/key/file for a different key file, or --url https://your-n8n-host for the address.
"""
import json, os, sys, urllib.request, urllib.error

ARGS = sys.argv[1:]
HERE = os.path.dirname(os.path.abspath(__file__))
FILE = os.path.join(HERE, 'cristina-contact-form.json')
DEFAULT_KEYFILE = os.path.expanduser('~/projects/all-pnl-apps/' + '.' + 'env')
DEFAULT_URL = 'https://alexpirvulescu.app.n8n.cloud'


def opt(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS and ARGS.index(name) + 1 < len(ARGS) else default


def load_workflow():
    wf = json.load(open(FILE, encoding='utf-8'))
    names = {n['name'] for n in wf['nodes']}
    for src, outs in wf['connections'].items():
        if src not in names:
            sys.exit('STOP: a connection starts at a node that does not exist: ' + src)
        for branch in outs['main']:
            for link in branch:
                if link['node'] not in names:
                    sys.exit('STOP: a connection points at a node that does not exist: ' + link['node'])
    # only the fields the n8n API accepts when creating a workflow
    return {k: wf[k] for k in ('name', 'nodes', 'connections', 'settings')}


wf = load_workflow()
if '--selftest' in ARGS:
    print('OK: "%s" has %d nodes and all connections point at real nodes.' % (wf['name'], len(wf['nodes'])))
    sys.exit(0)

# the key: from the N8N_API_KEY_WRITE variable in your Terminal if set, otherwise from the key file
# (it is never printed)
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
                                          'User-Agent': 'cristina-website-setup/1.0'})  # python's default agent is often refused by web firewalls
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit('STOP: n8n answered %s %s. Nothing was changed.' % (e.code, e.reason))
    except urllib.error.URLError as e:
        sys.exit('STOP: could not reach %s (%s). Nothing was changed.' % (base, e.reason))


print('n8n address:', base)
existing = call('GET', '/workflows?limit=250')
items = existing.get('data', [])
print('Your n8n has %d workflow(s) I can see.' % len(items))
dupes = [w for w in items if w.get('name') == wf['name']]
if dupes:
    sys.exit('STOP: a workflow called "%s" already exists (id %s). Nothing was created.' % (wf['name'], dupes[0].get('id')))

print('Would create ONE new workflow, switched off:')
print('  name :', wf['name'])
print('  steps:', ' > '.join(n['name'] for n in wf['nodes']))
print('  address once switched on: %s/webhook/cp-contact' % base)

if '--apply' not in ARGS:
    print('\nCHECK ONLY. Nothing was changed. Run again with --apply to create it.')
    sys.exit(0)

made = call('POST', '/workflows', wf)
print('\nCREATED. Workflow id:', made.get('id'))
print('Open it here:  %s/workflow/%s' % (base, made.get('id')))
print('Next: open it, pick your Gmail account on the "Send to Cristina\'s inbox" step, then switch it on.')
