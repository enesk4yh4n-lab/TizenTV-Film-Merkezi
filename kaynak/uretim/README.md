# Build and package

From the repository root, with Python 3:

```text
python kaynak/uretim/package.py
```

This packages only the explicit file list and creates an unsigned public WGT. Do not include local developer signatures. Bundled component signatures are already supplied; changing core files requires a new component version signed with your own distribution key.

For native TLS builds see `../ortak/ag/native/README.md`. The external Samsung Pepper 47 SDK is required. No SDK installation, compiler, private key or signing certificate is distributed here.
