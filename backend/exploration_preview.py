import argparse
import json
from getpass import getpass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

VIEWER = Path(__file__).resolve().parents[1] / "mobile" / "exploration"


def serve(token: str = "") -> None:
    viewer_config = json.dumps({"ionToken": token, "photorealistic": False})

    class PreviewHandler(BaseHTTPRequestHandler):
        files = {
            "/": ("maplibre.html", "text/html"),
            "/maplibre.js": ("maplibre.js", "text/javascript"),
            "/cesium/": ("index.html", "text/html"),
            "/cesium/viewer.js": ("viewer.js", "text/javascript"),
        }

        def do_GET(self) -> None:
            if self.path == "/cesium/config.js":
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

    with ThreadingHTTPServer(("0.0.0.0", 8766), PreviewHandler) as server:
        print("MapLibre preview listening on port 8766. Press Ctrl+C to stop.", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the local exploration preview.")
    parser.add_argument("--cesium", action="store_true", help="Enable Cesium at /cesium/ with a public token.")
    options = parser.parse_args()
    token = getpass("Public Cesium ion token: ").strip() if options.cesium else ""
    try:
        serve(token)
    except KeyboardInterrupt:
        pass
