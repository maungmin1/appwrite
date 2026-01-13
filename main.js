const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const UUID = process.env.UUID || '0a6568ff-ea3c-4271-9020-450560e10d65';
const ARGO_TOKEN = process.env.ARGO_AUTH || ''; // Cloudflare Tunnel Token
const PORT = 8080;

// Xray Config ဖန်တီးခြင်း
const xrayConfig = {
    inbounds: [{
        port: PORT,
        protocol: "vless",
        settings: { clients: [{ id: UUID }], decryption: "none" },
        streamSettings: { network: "ws", wsSettings: { path: "/" } }
    }],
    outbounds: [{ protocol: "freedom" }]
};

fs.writeFileSync('/tmp/config.json', JSON.stringify(xrayConfig));

// 1. Start Xray
const xray = spawn('./bin/xray', ['-c', '/tmp/config.json']);
console.log("🚀 Xray Core Started...");

// 2. Start Cloudflare Tunnel
const argoArgs = ARGO_TOKEN 
    ? ['tunnel', '--no-autoupdate', 'run', '--token', ARGO_TOKEN]
    : ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PORT}`];

const argo = spawn('./bin/cloudflared', argoArgs);

argo.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('.trycloudflare.com')) {
        const domain = msg.match(/[a-zA-Z0-9-]+\.trycloudflare\.com/)[0];
        console.log("\n--- ✨ YOUR VLESS LINK ---");
        console.log(`vless://${UUID}@${domain}:443?encryption=none&security=tls&sni=${domain}&type=ws&host=${domain}&path=%2F#Appwrite-VLESS`);
        console.log("--------------------------\n");
    }
});

module.exports = async (context) => {
    return context.res.json({ status: "running", uuid: UUID });
};
