'use strict';

// Serves a built book under http://127.0.0.1:<port>/docs/ so every browser
// test also covers sub-path hosting.
//
//   node serve.js [out-dir] [port]      (defaults: $MG_OUT or /tmp/mg-out, $MG_PORT or 4317)

const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.env.MG_OUT || '/tmp/mg-out');
const port = Number(process.argv[3] || process.env.MG_PORT || 4317);
const PREFIX = '/docs/';

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

function send(res, status, body, type) {
    res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8' });
    res.end(body);
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/docs') {
        res.writeHead(301, { Location: PREFIX });
        return res.end();
    }
    if (!url.pathname.startsWith(PREFIX)) return send(res, 404, 'not found');

    let rel;
    try {
        rel = decodeURIComponent(url.pathname.slice(PREFIX.length));
    } catch (e) {
        return send(res, 400, 'bad request');
    }
    let file = path.join(root, rel);
    if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, 'forbidden');

    fs.stat(file, (err, stat) => {
        if (!err && stat.isDirectory()) file = path.join(file, 'index.html');
        fs.readFile(file, (readErr, data) => {
            if (readErr) return send(res, 404, 'not found');
            send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
        });
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log('serving ' + root + ' at http://127.0.0.1:' + port + PREFIX);
});
