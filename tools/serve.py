#!/usr/bin/env python3
"""Kleiner Webserver zum Entwickeln (macOS, Linux, überall mit Python 3).

Liefert den Projektordner aus und verbietet jedes Zwischenspeichern. Ohne das merkt sich der
Browser die ES-Module und zeigt nach einer Änderung weiter den alten Stand an.

    python3 tools/serve.py          # Port 8080
    python3 tools/serve.py 3000     # eigener Port
"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.webp': 'image/webp'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Nur Fehler melden; der normale Verkehr würde die Ausgabe zumüllen.
        if not args or not str(args[0]).startswith(('GET', 'HEAD')) or str(args[1]) != '200':
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoCacheHandler, directory=root)
    with http.server.ThreadingHTTPServer(('127.0.0.1', port), handler) as httpd:
        print(f'AnimalWarrior läuft auf http://localhost:{port}/ (Tests: /tests.html)')
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
