import argparse
import json
from getpass import getpass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VIEWER = Path(__file__).resolve().parents[1] / "mobile" / "exploration"


def serve(token: str = "", google_key: str = "", *, port: int = 8766) -> None:
    viewer_config = json.dumps({"ionToken": token, "photorealistic": False})

    class PreviewHandler(BaseHTTPRequestHandler):
        files = {
            "/": ("google.html" if google_key else "maplibre.html", "text/html"),
            "/maplibre.js": ("maplibre.js", "text/javascript"),
            "/google.js": ("google.js", "text/javascript"),
            "/cesium/": ("index.html", "text/html"),
            "/cesium/viewer.js": ("viewer.js", "text/javascript"),
        }

        def do_GET(self) -> None:
            if self.path == "/google-config.js" and google_key:
                body = f"window.travelBuddyGoogleKey = {json.dumps(google_key)};".encode()
                content_type = "text/javascript"
            elif self.path == "/cesium/config.js":
                body = f"window.travelBuddyViewer = {viewer_config};".encode()
                content_type = "text/javascript"
            elif self.path in self.files:
                filename, content_type = self.files[self.path]
                body = (VIEWER / filename).read_bytes()
            else:
                self.send_error(404)
                return

            self.send_response(200)
            self.send_header("Content-Type", f"{content_type}; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    with ThreadingHTTPServer(("0.0.0.0", port), PreviewHandler) as server:
        provider = "Google Maps" if google_key else "MapLibre"
        print(f"{provider} preview listening on port {port}. Press Ctrl+C to stop.", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the local exploration preview.")
    parser.add_argument("--cesium", action="store_true", help="Enable Cesium at /cesium/ with a public token.")
    parser.add_argument("--google", action="store_true", help="Serve Google Maps with a restricted browser key.")
    options = parser.parse_args()
    token = getpass("Public Cesium ion token: ").strip() if options.cesium else ""
    google_key = getpass("Restricted Google Maps browser key: ").strip() if options.google else ""
    if options.google and not google_key:
        raise SystemExit("A Google Maps browser key is required.")
    try:
        serve(token, google_key)
    except KeyboardInterrupt:
        pass
