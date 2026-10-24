# Agent instructions

## Purpose and layout

This is the public, ready-to-serve static website for **nuyina.org**.

- `public/` contains every file intended to be served to visitors.
- `public/index.html` is the required, nonempty homepage.
- Root-level documentation is not deployed as website content.
- There is no build step, package manager, framework requirement, or application backend.

Keep changes simple: HTML, CSS, JavaScript and static assets. Never add secrets
anywhere in this public repository, including its history. Root files are not
served by nginx, but they remain publicly visible on GitHub.

## Deployment contract

The separate `BeaudanBrown/bepis-dotfiles` repository owns rozzy's NixOS hosting
configuration, under `modules/services/git-static-site/`. This repository does
not manage nginx, DNS, TLS, credentials or server configuration.

Once that configuration is deployed, an unprivileged systemd updater polls this
repository's `main` branch approximately every two minutes after each run ends.
It fetches a shallow snapshot, exports only `public/`, validates it, and atomically
switches the published release. No repository code or build scripts run on the
server. There are no webhooks or server credentials for contributors.

Publication rules:

- Keep a nonempty regular file at `public/index.html`.
- Do not put hidden files or directories, symlinks, or special files in `public/`.
- Each published release is limited to 100 MiB of file contents and 10,000 entries.
- Keep the entire repository small: the publication limit is not a Git transfer
  or cache quota. Avoid large media and unnecessary history.
- Failed fetches or validation retain the previously published website.
- Three releases, including the current one, are retained on the server.
- Ordinary rollback is a Git revert on `main`; server-only rollback is temporary.

The canonical URL is `https://nuyina.org`; `https://www.nuyina.org` redirects
there. This is conventional static hosting: missing paths return 404, directory
listings are disabled, and there is no single-page-application fallback.

The hosting configuration is enabled in Nix source, but live deployment and DNS
must be completed by the owner. Do not claim the site is live without checking.

## Working and verification

Changes on another branch do not publish until merged into `main`. Follow the
owner's instructions about committing and pushing; do not change hosting or DNS
as part of a content edit. Test links, asset paths, accessibility and mobile layout.

Preview locally with `python3 -m http.server --bind 127.0.0.1 --directory public 8000`
and visit `http://127.0.0.1:8000`. Stop the preview when finished. If Python is not
available on NixOS, use `nix shell nixpkgs#python3 -c python3 -m http.server
--bind 127.0.0.1 --directory public 8000` instead of installing it globally.

The hosting repository contains publication tests and operational instructions;
this repository intentionally has no build pipeline.
