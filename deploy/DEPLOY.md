# Running the habit tracker in Docker (in a small VM)

GitHub Actions builds a Docker image and publishes it to `ghcr.io/igranic8720/habit-tracker`. The VM only
needs Docker and one file (`compose.yaml`). It pulls the image; no code is ever copied. Your data lives in a
folder next to the compose file, so updating never touches it.

```
/opt/habits/compose.yaml   the only file the VM needs
/opt/habits/data/          your data                          <- survives every update
  habits/*.json            one file per habit
  workouts/                plans.json, cycles.json, log.json (+ backups/: a daily copy, last 14)
```

## 1. Get an image published (once)

Push the repo to GitHub. The "Build" workflow (`.github/workflows/docker.yml`) lints and builds the app, then
builds the image and publishes it. Tags it creates:

| Tag | When |
|---|---|
| `latest` | pushes to the default branch (`main`) |
| `<branch-name>` | pushes to any branch, e.g. `habit-tracker-app` |
| `sha-abc1234` | every push; pin one of these to roll back |
| `1.2.3` | when you push a git tag like `v1.2.3` |

The code is currently on the `habit-tracker-app` branch, so there is no `latest` until it is merged to `main`.
Until then, set `HABITS_IMAGE=ghcr.io/igranic8720/habit-tracker:habit-tracker-app` (see step 3).

**Package visibility.** Packages from a private repo are private. Either make the package public (GitHub →
your profile → Packages → habit-tracker → Package settings → Change visibility; it contains no personal data,
your habits are in the volume), or log the VM in once:

```bash
# token: GitHub → Settings → Developer settings → Personal access tokens (classic), scope read:packages
echo YOUR_TOKEN | docker login ghcr.io -u igranic8720 --password-stdin
```

## 2. Create a lightweight VM (Proxmox)

- Debian 12 (cloud image or minimal netinst, no desktop). Alpine works too and is lighter, but Debian is the
  easier one to look after.
- 1 vCPU, 1 GB RAM (512 MB is enough), 8 GB disk. Install the QEMU guest agent and tick "Start at boot".
- Give it a fixed IP (or a DHCP reservation).

Install Docker inside the VM (as your normal user with sudo):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # then log out and back in
docker compose version             # should print a version
```

## 3. Deploy

From the project folder on your computer, copy the compose file over:

```bash
ssh you@VM_IP 'sudo mkdir -p /opt/habits/data && sudo chown -R $USER /opt/habits'
scp compose.yaml you@VM_IP:/opt/habits/
```

Optionally bring your existing habits along:

```bash
rsync -a data/habits/ you@VM_IP:/opt/habits/data/habits/
```

Then, in the VM:

```bash
cd /opt/habits
sudo chown -R 1000:1000 data       # the container runs as uid 1000
echo 'HABITS_IMAGE=ghcr.io/igranic8720/habit-tracker:habit-tracker-app' > .env   # only until :latest exists
docker compose pull && docker compose up -d
docker compose ps                  # should say "healthy" after a few seconds
```

Open `http://VM_IP:3000` on your computer or phone while on your home network.

## Updating

In the VM:

```bash
cd /opt/habits && docker compose pull && docker compose up -d && docker image prune -f
```

It takes a few seconds. The old container is replaced; `./data` is untouched.

## Rolling back

Run the previous image by tag. Every push has a `sha-...` tag, listed under the repo's Packages on GitHub:

```bash
echo 'HABITS_IMAGE=ghcr.io/igranic8720/habit-tracker:sha-abc1234' > /opt/habits/.env
cd /opt/habits && docker compose up -d
```

Delete the `.env` line (or set it back to a newer tag) to follow `latest` again.

## Backups

- Your data is plain JSON files: `tar -czf habits-$(date +%F).tar.gz -C /opt/habits data` is a complete backup.
- Add a scheduled Proxmox backup job for the VM, and take a snapshot before big changes.
- A habit you delete in the app is moved to `data/habits/.deleted/`, not erased.
- Workouts are kept apart from habits in `data/workouts/`. `log.json` (everything you have done) also gets a once-a-day copy in `data/workouts/backups/`, so a bad save can never wipe your history.

## Building without GitHub (optional)

On your computer:

```bash
docker build -t habit-tracker:local .
docker save habit-tracker:local | ssh you@VM_IP docker load
ssh you@VM_IP 'cd /opt/habits && HABITS_IMAGE=habit-tracker:local docker compose up -d'
```

## Useful commands (in /opt/habits)

| What | Command |
|---|---|
| Is it running / healthy? | `docker compose ps` |
| Follow the log | `docker compose logs -f` |
| Restart | `docker compose restart` |
| Stop / start | `docker compose stop` / `docker compose start` |
| Change the port | edit the `ports:` line in `compose.yaml` (`"8080:3000"`), then `docker compose up -d` |

## Troubleshooting

- **"Couldn't save" in the app's header:** the data folder isn't writable by the container. Run
  `sudo chown -R 1000:1000 /opt/habits/data`.
- **`pull access denied` / `unauthorized`:** the package is private. Run the `docker login` from step 1, or make
  the package public.
- **`manifest unknown`:** that tag doesn't exist yet. Check the Build workflow ran, or use a tag that does
  (see step 1).

## Security

There is **no login**, and your notes are personal. Keep the VM reachable only from your home network, or over
a VPN such as Tailscale or WireGuard. Don't port-forward it to the internet. If you later put a reverse proxy in
front, change the port mapping to `"127.0.0.1:3000:3000"` so only the proxy can reach it.
