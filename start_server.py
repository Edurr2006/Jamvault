#!/usr/bin/env python3
"""
Simple HTTP Server for JamStudio Pro
Serves files with proper MIME types for ES6 modules
"""

import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def guess_type(self, path):
        # Ensure .js files are served with correct MIME type
        if path.endswith('.js'):
            return 'application/javascript'
        return super().guess_type(path)

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"JamStudio Pro servidor corriendo en http://localhost:{PORT}")
    print(f"Abre tu navegador en: http://localhost:{PORT}/JamstudioPro.html")
    print("Presiona Ctrl+C para detener el servidor")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServidor detenido")
