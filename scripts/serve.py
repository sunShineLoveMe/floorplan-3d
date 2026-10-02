"""Local server: revalidate HTML and resources even when reusing an old origin."""
import argparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
class Server(ThreadingHTTPServer):
    request_queue_size = 128
class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8086)
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    Server(('127.0.0.1', args.port), partial(Handler, directory=str(root))).serve_forever()
