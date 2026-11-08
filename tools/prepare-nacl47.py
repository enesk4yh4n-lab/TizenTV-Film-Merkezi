"""Extract only the Linux/ARM/x86 SDK parts from Samsung's official ZIP.

HTTP ranges avoid downloading the macOS/Windows and unused SDK toolchains.
Every extracted regular file is checked against the ZIP CRC. No TV access.
"""
import argparse
import io
import os
from pathlib import Path
import stat
import struct
import time
import urllib.request
import zipfile
import zlib

URL = 'https://developer.samsung.com/smarttv/file/b7e3cb3a-9b3d-4651-9404-3980dac50cdf'


def get_range(start, end):
    request = urllib.request.Request(URL, headers={'Range': 'bytes=%d-%d' % (start, end)})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                if response.status != 206 or not response.headers.get('Content-Range', '').startswith('bytes %d-' % start):
                    raise RuntimeError('Server did not honor requested SDK range')
                data = response.read(end - start + 1)
                if len(data) != end - start + 1:
                    raise RuntimeError('Incomplete SDK range')
                return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1)


def selected(name):
    return (name.startswith(('pepper_47/include/', 'pepper_47/toolchain/linux_arm_newlib/', 'pepper_47/toolchain/linux_x86_newlib/'))
            or any(name.startswith('pepper_47/lib/' + arch + '/Release/') for arch in ['newlib_arm', 'newlib_x86_32', 'newlib_x86_64'])
            or name in ['pepper_47/LICENSE', 'pepper_47/NOTICE', 'pepper_47/COPYING', 'pepper_47/AUTHORS', 'pepper_47/README'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--central', required=True)
    parser.add_argument('--sdk', required=True)
    args = parser.parse_args()
    central = Path(args.central).read_bytes()
    tail = central.rfind(b'PK\x05\x06')
    fields = struct.unpack('<4s4H2LH', central[tail:tail + 22])
    base = fields[6]
    sdk = Path(args.sdk).resolve()
    sdk.mkdir(parents=True, exist_ok=True)
    entries = []
    with zipfile.ZipFile(io.BytesIO(central)) as archive:
        for item in archive.infolist():
            if selected(item.filename) and not item.is_dir():
                item.header_offset += base
                entries.append(item)
    entries.sort(key=lambda item: item.header_offset)
    groups = []
    for item in entries:
        end = item.header_offset + 30 + len(item.filename.encode('utf-8')) + len(item.extra) + item.compress_size + 1024
        if not groups or item.header_offset - groups[-1][1] > 128 * 1024 or end - groups[-1][0] > 16 * 1024 * 1024:
            groups.append([item.header_offset, end, [item]])
        else:
            groups[-1][1] = max(groups[-1][1], end)
            groups[-1][2].append(item)
    print('Selected %d files, %d MiB in %d ranges' % (len(entries), sum(g[1] - g[0] + 1 for g in groups) // 1048576, len(groups)), flush=True)
    for number, (start, end, items) in enumerate(groups, 1):
        block = get_range(start, end)
        for item in items:
            target = (sdk / item.filename).resolve()
            if not target.is_relative_to(sdk):
                raise RuntimeError('SDK entry escapes destination')
            offset = item.header_offset - start
            header = struct.unpack('<4s5H3L2H', block[offset:offset + 30])
            if header[0] != b'PK\x03\x04':
                raise RuntimeError('Invalid SDK file header: ' + item.filename)
            data_start = offset + 30 + header[-2] + header[-1]
            compressed = block[data_start:data_start + item.compress_size]
            data = zlib.decompress(compressed, -15) if item.compress_type == zipfile.ZIP_DEFLATED else compressed
            if len(data) != item.file_size or zlib.crc32(data) & 0xffffffff != item.CRC:
                raise RuntimeError('SDK CRC verification failed: ' + item.filename)
            target.parent.mkdir(parents=True, exist_ok=True)
            mode = item.external_attr >> 16
            if stat.S_ISLNK(mode):
                link = data.decode('utf-8')
                if not (target.parent / link).resolve().is_relative_to(sdk):
                    raise RuntimeError('SDK symlink escapes destination')
                if not target.exists() and not target.is_symlink():
                    target.symlink_to(link)
            else:
                target.write_bytes(data)
                os.chmod(target, mode & 0o777 or 0o644)
        print('SDK range %d/%d verified (%d files)' % (number, len(groups), len(items)), flush=True)
    print('SDK ready: ' + str(sdk / 'pepper_47'), flush=True)


if __name__ == '__main__':
    main()
