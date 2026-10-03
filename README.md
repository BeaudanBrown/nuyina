# Nuyina website

The static website for **[nuyina.com](https://nuyina.com)**.

## Updating the site

1. Accept your GitHub collaborator invitation and clone this repository.
2. Edit the files inside **`public/`**. The homepage is **`public/index.html`**.
3. Commit your changes and push to **`main`**, or merge your pull request into it.
4. Once hosting is deployed, the server picks up changes automatically, normally
   within a few minutes. You do not need server access or a manual deployment.

There is no build step. Put ready-to-serve HTML, CSS, JavaScript, images and other
assets in `public/`. Files outside that directory are not served as website
content, but **everything in this repository is public on GitHub**. Never commit
passwords, API keys, private notes or other sensitive information.

## Preview locally

From the repository directory:

```sh
python3 -m http.server --bind 127.0.0.1 --directory public 8000
```

Visit **http://127.0.0.1:8000**. Press Ctrl+C to stop the preview.

## Publishing rules

- Keep `public/index.html` present and nonempty.
- Use ordinary files and directories, not symlinks or hidden files/directories.
- Keep `public/` under **100 MiB** and **10,000 files/directories**.
- Keep large media out of the repository; Git downloads have no separate size quota.
- Missing pages return 404. Client-side routing does not automatically fall back
  to the homepage.

If an update cannot be fetched or fails validation, the previous site stays
online. Undo an unwanted published update by reverting its commit on `main`.
The owner can inspect server logs if a valid update is not appearing. There are
no email alerts.

## Hosting setup — owner only

Hosting is managed by the separate
[bepis-dotfiles repository](https://github.com/BeaudanBrown/bepis-dotfiles), on
rozzy using nginx, HTTPS and a polling systemd updater. The friend manages DNS;
contributors do not need SSH access or DNS API credentials.

The Nix configuration is enabled in source, but that alone does not deploy it.
Before the website is live, the owner must:

1. Invite the friend's GitHub account as a collaborator under repository settings.
2. Have the friend point the apex domain's A record at rozzy's current public
   IPv4 address and set `www` to a CNAME for the apex (or the same A record).
3. Remove conflicting IPv6 records, ensure any CAA restrictions permit Let's
   Encrypt, and allow inbound TCP ports 80 and 443 through external firewalls.
4. Transfer the updated dotfiles to rozzy and switch its NixOS configuration.
5. Check publication logs and HTTPS on both names. `www` redirects to the apex.

Exact deployment commands and troubleshooting instructions are in
`modules/services/git-static-site/README.md` in the hosting repository.
