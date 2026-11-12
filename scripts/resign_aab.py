#!/usr/bin/env python3
"""Resign an AAB with a PKCS12 keystore using Python stdlib + openssl CLI."""
import os, sys, shutil, tempfile, hashlib, zipfile, subprocess, base64

AAB = "/tmp/cc-agent/69132850/project/android/app/build/outputs/bundle/release/app-release.aab"
KEYSTORE = "/tmp/cc-agent/69132850/project/android/app/signing.keystore"
STOREPASS = "0smnw4pfchc"
ALIAS = "my-key-alias"
KEYPASS = "0smnw4pfchc"
OUT = AAB

MANIFEST_HEAD = b"Manifest-Version: 1.0\r\nCreated-By: resign_aab.py (Python stdlib)\r\n\r\n"

def run(args, **kw):
    r = subprocess.run(args, capture_output=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stderr.decode(errors="replace"))
        raise SystemExit(f"Command failed: {' '.join(args[:3])}...")
    return r

backup = AAB + ".old-key-backup"
shutil.copy2(AAB, backup)
print(f"[1/7] Backed up old AAB -> {backup}")

r = run(["openssl", "pkcs12", "-in", KEYSTORE, "-nokeys", "-passin", f"pass:{STOREPASS}"])
cert_pem = r.stdout
r = run(["openssl", "x509", "-outform", "DER"], input=cert_pem)
cert_der = r.stdout
r = run(["openssl", "x509", "-inform", "DER", "-fingerprint", "-sha1", "-noout"], input=cert_der)
sha1_fp = r.stdout.decode().strip().split("=")[1]
print(f"[2/7] Keystore cert SHA-1: {sha1_fp}")

tmp = tempfile.mkdtemp(prefix="aab-resign-")
strip_dir = os.path.join(tmp, "stripped")
os.makedirs(strip_dir)
with zipfile.ZipFile(AAB, 'r') as zin:
    for item in zin.infolist():
        upper = item.filename.upper()
        if upper.startswith("META-INF/") and (
            upper.endswith(".SF") or upper.endswith(".RSA") or upper.endswith(".DSA") or upper.endswith(".EC") or upper == "META-INF/MANIFEST.MF"
        ):
            print(f"   stripping {item.filename}")
            continue
        target = os.path.join(strip_dir, item.filename)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with zin.open(item) as src, open(target, 'wb') as dst:
            shutil.copyfileobj(src, dst)
print(f"[3/7] Stripped old signatures")

entries = []
for root, _, files in os.walk(strip_dir):
    for f in sorted(files):
        full = os.path.join(root, f)
        rel = os.path.relpath(full, strip_dir).replace(os.sep, "/")
        if rel.upper().startswith("META-INF/"):
            continue
        entries.append((rel, full))

manifest_lines = [MANIFEST_HEAD]
for rel, full in entries:
    with open(full, 'rb') as fh:
        data = fh.read()
    sha256_b64 = base64.b64encode(hashlib.sha256(data).digest()).decode()
    sha1_b64 = base64.b64encode(hashlib.sha1(data).digest()).decode()
    manifest_lines.append(f"Name: {rel}\r\nSHA-256-Digest: {sha256_b64}\r\nSHA-1-Digest: {sha1_b64}\r\n\r\n".encode())
manifest_bytes = b"".join(manifest_lines)
manifest_path = os.path.join(strip_dir, "META-INF", "MANIFEST.MF")
os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
with open(manifest_path, 'wb') as fh:
    fh.write(manifest_bytes)
print(f"[4/7] Wrote MANIFEST.MF ({len(entries)} entries)")

sf_name = "MY-KEY-A.SF"
manifest_sha256_b64 = base64.b64encode(hashlib.sha256(manifest_bytes).digest()).decode()
manifest_sha1_b64 = base64.b64encode(hashlib.sha1(manifest_bytes).digest()).decode()
sf_lines = [
    b"Signature-Version: 1.0\r\n",
    f"SHA-256-Digest-Manifest: {manifest_sha256_b64}\r\n".encode(),
    f"SHA-1-Digest-Manifest: {manifest_sha1_b64}\r\n".encode(),
    b"\r\n",
]
sections = manifest_bytes.split(b"\r\n\r\n")
for i, (rel, full) in enumerate(entries):
    section = sections[i + 1] + b"\r\n\r\n"
    s_sha256 = base64.b64encode(hashlib.sha256(section).digest()).decode()
    sf_lines.append(f"Name: {rel}\r\nSHA-256-Digest: {s_sha256}\r\n\r\n".encode())
sf_bytes = b"".join(sf_lines)
sf_path = os.path.join(strip_dir, "META-INF", sf_name)
with open(sf_path, 'wb') as fh:
    fh.write(sf_bytes)

r = run(["openssl", "pkcs12", "-in", KEYSTORE, "-nocerts", "-nodes", "-passin", f"pass:{STOREPASS}"])
key_pem = r.stdout
combo_path = os.path.join(tmp, "keycert.pem")
with open(combo_path, 'wb') as fh:
    fh.write(key_pem)
    fh.write(cert_pem)
p7_path = os.path.join(tmp, "signature.p7b")
r = run([
    "openssl", "smime", "-sign", "-binary", "-in", sf_path, "-out", p7_path,
    "-outform", "DER", "-inkey", combo_path, "-signer", "/dev/stdin",
    "-passin", f"pass:{KEYPASS}"
], input=cert_pem)
with open(p7_path, 'rb') as fh:
    p7_der = fh.read()
rsa_path = os.path.join(strip_dir, "META-INF", "MY-KEY-A.RSA")
with open(rsa_path, 'wb') as fh:
    fh.write(p7_der)
print(f"[5/7] Signed .SF -> MY-KEY-A.RSA ({len(p7_der)} bytes)")

out_path = os.path.join(tmp, "resigned.aab")
with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
    for sigf in ["META-INF/MANIFEST.MF", f"META-INF/{sf_name}", "META-INF/MY-KEY-A.RSA"]:
        full = os.path.join(strip_dir, sigf)
        zout.write(full, sigf, zipfile.ZIP_STORED)
    for rel, full in entries:
        zout.write(full, rel, zipfile.ZIP_DEFLATED, compresslevel=9)
print(f"[6/7] Repackaged AAB -> {out_path}")

shutil.copy2(out_path, OUT)
print(f"[7/7] Wrote final AAB -> {OUT}")
print(f"\nCert SHA-1: {sha1_fp}")

r = run(["openssl", "pkcs7", "-inform", "DER", "-in", rsa_path, "-print_certs"])
r2 = run(["openssl", "x509", "-noout", "-fingerprint", "-sha1"], input=r.stdout)
print(f"Verified embedded cert in AAB: {r2.stdout.decode().strip()}")
