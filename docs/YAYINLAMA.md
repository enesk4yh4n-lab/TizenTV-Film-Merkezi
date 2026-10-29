# Release procedure

Run `npm ci`, `npm test` and `python scripts/build.py`. The public WGT is unsigned on purpose: the recipient's installer obtains a device-authorized certificate and re-signs it. Never upload a private signing profile, password or user records.

Attach `Film-Merkezi-TV-1.0.0-public.wgt`, `Film-Merkezi-Kaynak-1.0.0.zip`, `Film-Merkezi-Kaynak-Tam-1.0.0.zip`, `SHA256SUMS.txt` and the static scan report to release **v1.0.0**. The native/decoder source ZIP carries the original MPL CA source and must remain available wherever the WGT is distributed. Source notices in the WGT identify these download locations.

The community manifest must select the exact public WGT asset using `assets[].match`; the release has several assets and the catalog's single-file shortcut would be ambiguous. Use category `streaming` and disclose adult-capable providers with `adult: true`. Do not set root or per-user API-key settings: this application needs neither.

The upstream catalog PR is a request for inclusion. Only Apps2Samsung maintainers can merge it into their catalog, after their schema, package and malware checks. A release or open PR is not a claim that all users can already see it.
