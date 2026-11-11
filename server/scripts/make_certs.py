"""Buat sertifikat HTTPS untuk server SPLV app di jaringan lokal sekolah.

- CA lokal (certs/ca.key + certs/ca.crt) dibuat SEKALI dan disimpan peneliti. ca.crt dibundel ke APK
  (res/raw/splv_ca.pem) sehingga HP siswa mempercayai server ini dan menolak server palsu.
- Sertifikat server (certs/server.key + certs/server.crt) bisa dibuat ulang kapan saja untuk IP
  laptop yang berbeda TANPA build ulang APK, selama CA-nya sama.

Contoh:
    python -m scripts.make_certs                       # deteksi IP laptop otomatis
    python -m scripts.make_certs --ip 192.168.1.10 --dns splv.sekolah.local

JAGA ca.key: siapa pun yang memilikinya bisa menyamar sebagai server Anda.
"""

import argparse
import datetime as dt
import ipaddress
import shutil
import socket
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

SERVER_DIR = Path(__file__).resolve().parents[1]
CERTS = SERVER_DIR / "certs"
APP_RAW = SERVER_DIR.parent / "app" / "android" / "app" / "src" / "main" / "res" / "raw"
APP_CA_COPY = SERVER_DIR.parent / "app" / "certs" / "splv_ca.pem"


def local_ips() -> list[str]:
    ips = {"127.0.0.1"}
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # no packet is sent; picks the LAN interface
            ips.add(s.getsockname()[0])
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    return sorted(ips)


def _write_key(path: Path, key) -> None:
    path.write_bytes(key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))


def load_or_create_ca() -> tuple[ec.EllipticCurvePrivateKey, x509.Certificate]:
    key_p, crt_p = CERTS / "ca.key", CERTS / "ca.crt"
    if key_p.exists() and crt_p.exists():
        key = serialization.load_pem_private_key(key_p.read_bytes(), password=None)
        return key, x509.load_pem_x509_certificate(crt_p.read_bytes())

    key = ec.generate_private_key(ec.SECP256R1())
    name = x509.Name([x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SPLV app"), x509.NameAttribute(NameOID.COMMON_NAME, "SPLV app Local CA")])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name).issuer_name(name).public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1)).not_valid_after(now + dt.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(x509.KeyUsage(digital_signature=True, key_cert_sign=True, crl_sign=True, content_commitment=False,
                                     key_encipherment=False, data_encipherment=False, key_agreement=False,
                                     encipher_only=False, decipher_only=False), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
        .sign(key, hashes.SHA256())
    )
    _write_key(key_p, key)
    crt_p.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    print(f"CA baru dibuat: {crt_p}")
    return key, cert


def make_server_cert(ca_key, ca_cert, ips: list[str], dns: list[str]) -> None:
    key = ec.generate_private_key(ec.SECP256R1())
    now = dt.datetime.now(dt.timezone.utc)
    sans = [x509.DNSName(d) for d in ["localhost", *dns]] + [x509.IPAddress(ipaddress.ip_address(i)) for i in ips]
    cert = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, ips[-1] if ips else "localhost")]))
        .issuer_name(ca_cert.subject).public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - dt.timedelta(days=1)).not_valid_after(now + dt.timedelta(days=825))
        .add_extension(x509.SubjectAlternativeName(sans), critical=False)
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
        .sign(ca_key, hashes.SHA256())
    )
    _write_key(CERTS / "server.key", key)
    # Full chain so clients can build the path to the bundled CA.
    (CERTS / "server.crt").write_bytes(cert.public_bytes(serialization.Encoding.PEM) + ca_cert.public_bytes(serialization.Encoding.PEM))
    print(f"Sertifikat server untuk: {', '.join(['localhost', *dns, *ips])} (berlaku 825 hari)")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--ip", action="append", default=[], help="IP laptop/server (boleh lebih dari satu)")
    p.add_argument("--dns", action="append", default=[], help="nama host tambahan")
    a = p.parse_args()

    CERTS.mkdir(exist_ok=True)
    ips = sorted(set(a.ip or local_ips()) | {"127.0.0.1"})
    ca_key, ca_cert = load_or_create_ca()
    make_server_cert(ca_key, ca_cert, ips, a.dns)

    pem = (CERTS / "ca.crt").read_bytes()
    APP_CA_COPY.parent.mkdir(parents=True, exist_ok=True)
    APP_CA_COPY.write_bytes(pem)
    if APP_RAW.parent.exists():
        APP_RAW.mkdir(exist_ok=True)
        shutil.copyfile(CERTS / "ca.crt", APP_RAW / "splv_ca.pem")
    fp = ca_cert.fingerprint(hashes.SHA256()).hex(":").upper()
    print(f"CA SHA-256: {fp}")
    print("Jalankan server:  python -m scripts.serve")
    for ip in ips:
        if ip != "127.0.0.1":
            print(f"Alamat untuk HP:  https://{ip}:8443")


if __name__ == "__main__":
    main()
