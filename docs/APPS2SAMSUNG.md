# Apps2Samsung catalog and certificates

Research checked on 29 October 2026, including stable **v2.8.3** source.

## Catalog inclusion

The public catalog is maintained at [Apps2Samsung/tizen-community-packages](https://github.com/Apps2Samsung/tizen-community-packages). Each app has one `packages/<owner>__<repo>.json` entry. The fastest route is a pull request; a contribution issue is also accepted. The project requires open-source/freely redistributable software, appropriate distribution rights and testing on at least one Tizen device/emulator. Maintainers make the acceptance decision.

Film Merkezi's release includes multiple assets, so the proposed manifest selects only `Film-Merkezi-TV-1.0.0-public.wgt` through `assets[].match`. It identifies `streaming`, sets `adult: true` because adult-capable site providers are included, and does not request root or per-user API values. The 18+ flag can hide the entry until the user opts in. See the [package format](https://github.com/Apps2Samsung/tizen-community-packages/blob/main/packages/README.md) and [schema](https://github.com/Apps2Samsung/tizen-community-packages/blob/main/packages.schema.json).

## What happens to signing

For ordinary third-party WGTs such as this one, Apps2Samsung re-signs the downloaded package for the recipient. The user signs in to Samsung when a signing profile must be created or renewed. A usable author certificate and a distributor certificate covering the TV's DUID can be reused without another login. When only device coverage changes, current provisioning code retains the author identity and regenerates the distributor certificate. Updating an already installed app with a different author certificate can conflict; do not regenerate unnecessarily or assume a developer's emulator certificate authorizes other people's TVs.

This workflow is performed by **Apps2Samsung**, not by Film Merkezi. The public WGT therefore contains no personal author/distributor signatures, P12/PFX, passwords or Samsung account data. Each user supplies their own device authorization. Date/time, certificate validity, existing installed signatures and the TV's developer-mode/network state still matter; no unconditional installation guarantee is made.

Primary implementation references:

- [Stable v2.8.3 desktop install service](https://github.com/Apps2Samsung/Apps2Samsung/blob/v2.8.3/Jellyfin2Samsung-CrossOS/Services/TizenInstallerService.cs)
- [Stable certificate provisioning/reuse](https://github.com/Apps2Samsung/Apps2Samsung/blob/v2.8.3/Apps2Samsung.Core/Certificate/CertificateProvisioningService.cs)
- [Stable Android WGT installer](https://github.com/Apps2Samsung/Apps2Samsung/blob/v2.8.3/Apps2Samsung.Mobile/Services/WgtInstaller.cs)
- [Current shared package installer](https://github.com/Apps2Samsung/Apps2Samsung/blob/beta/Apps2Samsung.Core/Install/PackageInstaller.cs)
- [Samsung certificate requirements](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

The app's version and operating code do not need a per-Tizen-version certificate. A device-authorized signing profile and a package compatible with that TV are required. Development emulator packages and Apps2Samsung's per-user signing are separate distribution paths.
