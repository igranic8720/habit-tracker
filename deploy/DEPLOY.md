# Deploying to a Proxmox LXC container

The app is a static build plus a tiny Node server (`server.js`, no dependencies). Your data lives in
plain JSON files in a folder **outside** the code, so updating never touches it.

```
/opt/habits            the code (this repo)          <- replaced on every update
/var/lib/habits        your data (habits/*.json)     <- never touched by updates
/var/backups/habits    dated backups of the data     <- made by update.sh
```

## 1. Create the container (Proxmox)

- Template: Debian 12 (or newer). Unprivileged is fine.
- 1 core, 256–512 MB RAM, 2 GB disk is plenty.
- Give it a fixed IP (or a DHCP reservation) and tick "Start at boot".

## 2. Install Node and tools (inside the container, as root)

Debian's own `nodejs` is too old for the build, so use NodeSource (Node 22 or newer):

```bash
apt update && apt install -y curl git rsync ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v          # should print v22.x or newer
```

## 3. Get the code into /opt/habits

**Option A: git** (the container can reach a git remote):

```bash
git clone <your-repo-url> /opt/habits
```

**Option B: rsync from your computer** (no remote needed). From the project folder on your computer:

```bash
ssh root@CONTAINER_IP 'mkdir -p /opt/habits'
./deploy/deploy-rsync.sh root@CONTAINER_IP     # copies the code, builds, and (after step 5) restarts
```

If you use option B you can skip ahead: do steps 4 and 5, then run the script again.

## 4. Create the user and data folder

```bash
useradd --system --no-create-home habits
mkdir -p /var/lib/habits && chown habits:habits /var/lib/habits
```

To bring your existing habits over from your computer (run on your computer; the `habits/` subfolder is the data):

```bash
rsync -a data/habits/ root@CONTAINER_IP:/var/lib/habits/habits/
ssh root@CONTAINER_IP 'chown -R habits:habits /var/lib/habits'
```

## 5. Build and start

```bash
cd /opt/habits
npm ci && npm run build
cp deploy/habits.service /etc/systemd/system/habits.service
systemctl daemon-reload
systemctl enable --now habits
systemctl status habits            # should say "active (running)"
curl http://localhost:3000/healthz # should print "ok"
```

Open `http://CONTAINER_IP:3000` on your computer or phone.

## Updating

Inside the container (git route):

```bash
/opt/habits/deploy/update.sh
```

Or from your computer (rsync route):

```bash
./deploy/deploy-rsync.sh root@CONTAINER_IP
```

Either way the script backs up the data, builds the new version while the old one keeps serving, then
restarts and checks the service came up. If the build fails, nothing is restarted.

## Rolling back

- Code: `git checkout <earlier-commit>` in `/opt/habits`, then `npm ci && npm run build && systemctl restart habits`
  (or deploy the earlier version again with rsync).
- Data: the newest backups are in `/var/backups/habits/`. To restore one:
  `systemctl stop habits && tar -xzf /var/backups/habits/data-DATE.tar.gz -C /var/lib/habits && systemctl start habits`
- Anything: restore the Proxmox snapshot of the container (take one before big changes).

A habit you delete in the app is moved to `/var/lib/habits/habits/.deleted/`, not erased.

## Useful commands

| What | Command |
|---|---|
| Is it running? | `systemctl status habits` |
| Follow the log | `journalctl -u habits -f` |
| Restart | `systemctl restart habits` |
| Change the port | edit `PORT=` in `/etc/systemd/system/habits.service`, then `systemctl daemon-reload && systemctl restart habits` |

## Security

There is **no login**, and your notes are personal. Keep it reachable only from your home network, or over a
VPN such as Tailscale or WireGuard. Don't port-forward it to the internet.
