/**
 * upload.js
 *
 * Upload the static Next export in ./out to the lang.64hz.cn web root.
 *
 * Usage:
 *   node upload.js
 *   node upload.js ./out /www/wwwroot/lang.64hz.cn
 *
 * Options can be provided by .env or environment variables:
 *   SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD, SFTP_KEY_PATH,
 *   SFTP_PRIVATE_KEY, SFTP_PASSPHRASE
 *   SFTP_LOCAL_DIR, SFTP_REMOTE_DIR
 *
 * Or by command line flags:
 *   node upload.js --host 8.153.161.157 --user root --password xxx
 */
const Client = require("ssh2-sftp-client");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

/**
 * Names the clean step must never delete. These are server-managed and are not
 * produced by the export, so nothing in ./out can ever shadow them:
 *   .user.ini    PHP-FPM per-directory config, written by the panel
 *   .htaccess    Apache per-directory config
 *   .well-known  ACME http-01 challenges and security.txt — deleting this
 *                mid-renewal breaks certificate issuance
 * A preserved directory keeps its entire subtree.
 */
const preserveList = new Set([".user.ini", ".htaccess", ".well-known"]);
const defaultLocalDir = "out";
const defaultRemoteDir = "/www/wwwroot/lang.64hz.cn";

function parseArgs(argv) {
	const options = {};
	const positional = [];

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}

		const key = arg.slice(2);
		const next = argv[index + 1];
		if (!next || next.startsWith("--")) {
			options[key] = true;
			continue;
		}

		options[key] = next;
		index += 1;
	}

	return { options, positional };
}

function readOption(options, key, envName, fallback = "") {
	const value = options[key] ?? process.env[envName];
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : fallback;
	}

	return value ?? fallback;
}

function buildConfig(options) {
	const keyPath = readOption(options, "key", "SFTP_KEY_PATH");
	const privateKey = readOption(options, "private-key", "SFTP_PRIVATE_KEY");
	const password = readOption(options, "password", "SFTP_PASSWORD");
	const passphrase = readOption(options, "passphrase", "SFTP_PASSPHRASE");

	const config = {
		host: readOption(options, "host", "SFTP_HOST", "8.153.161.157"),
		port: Number(readOption(options, "port", "SFTP_PORT", "22")),
		username: readOption(options, "user", "SFTP_USER", "root"),
	};

	if (keyPath) {
		config.privateKey = fs.readFileSync(path.resolve(keyPath));
	} else if (privateKey) {
		config.privateKey = privateKey.replace(/\\n/g, "\n");
	}

	if (password) {
		config.password = password;
	}

	if (passphrase) {
		config.passphrase = passphrase;
	}

	return config;
}

function assertSafeRemoteDir(remoteDir) {
	const normalized = path.posix.normalize(remoteDir);
	const unsafeDirs = new Set(["", ".", "/", "/www", "/www/wwwroot"]);

	if (unsafeDirs.has(normalized)) {
		throw new Error(`Refusing unsafe remote directory: ${remoteDir}`);
	}

	if (!normalized.startsWith("/www/wwwroot/")) {
		throw new Error(`Remote directory must be under /www/wwwroot: ${remoteDir}`);
	}
}

async function ensureRemoteDir(sftp, remoteDir) {
	const exists = await sftp.exists(remoteDir);
	if (exists) {
		console.log(`Remote directory exists: ${remoteDir}`);
		return;
	}

	console.log(`Creating remote directory: ${remoteDir}`);
	await sftp.mkdir(remoteDir, true);
}

/**
 * Remove everything under `remoteDir` except the preserved names.
 *
 * Returns true when anything was kept at or below this level. The caller uses
 * that to skip its own `rmdir`: a preserved entry leaves its parent non-empty,
 * and `rmdir` fails on a non-empty directory.
 */
async function cleanRemoteDir(sftp, remoteDir) {
	const list = await sftp.list(remoteDir);
	let preservedAny = false;

	for (const item of list) {
		const remotePath = path.posix.join(remoteDir, item.name);

		if (preserveList.has(item.name)) {
			// never descend into a preserved directory — the whole subtree stays
			console.log(`Preserve: ${remotePath}${item.type === "d" ? "/" : ""}`);
			preservedAny = true;
			continue;
		}

		if (item.type === "d") {
			if (await cleanRemoteDir(sftp, remotePath)) {
				preservedAny = true;
				continue;
			}

			await sftp.rmdir(remotePath);
			console.log(`Removed directory: ${remotePath}`);
			continue;
		}

		await sftp.delete(remotePath);
		console.log(`Removed file: ${remotePath}`);
	}

	return preservedAny;
}

async function deploy(localDir, remoteDir, config) {
	const resolvedLocalDir = path.resolve(localDir);
	const indexPath = path.join(resolvedLocalDir, "index.html");

	if (!fs.existsSync(indexPath)) {
		throw new Error(`Static export was not found: ${indexPath}. Run npm run build first.`);
	}

	assertSafeRemoteDir(remoteDir);

	const sftp = new Client();
	try {
		await sftp.connect(config);
		console.log(`Connected: ${config.host}:${config.port}`);

		await ensureRemoteDir(sftp, remoteDir);

		console.log(`Cleaning remote directory: ${remoteDir}`);
		await cleanRemoteDir(sftp, remoteDir);

		console.log(`Uploading ${resolvedLocalDir} -> ${remoteDir}`);
		await sftp.uploadDir(resolvedLocalDir, remoteDir);

		console.log("Upload finished.");
	} finally {
		await sftp.end().catch(() => undefined);
	}
}

async function main() {
	const { options, positional } = parseArgs(process.argv.slice(2));
	const localDir = positional[0] || readOption(options, "local-dir", "SFTP_LOCAL_DIR", defaultLocalDir);
	const remoteDir = positional[1] || readOption(options, "remote-dir", "SFTP_REMOTE_DIR", defaultRemoteDir);
	const config = buildConfig(options);

	if (!config.password && !config.privateKey) {
		console.warn("No SFTP password or private key was provided. SSH agent auth may be required.");
	}

	await deploy(localDir, remoteDir, config);
}

main().catch((error) => {
	console.error(error.message || error);
	process.exit(1);
});
