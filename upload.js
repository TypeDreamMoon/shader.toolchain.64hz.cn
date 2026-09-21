/**
 * upload.js
 *
 * Upload the static Next export in ./out to the lang.64hz.cn web root.
 *
 * Usage:
 *   node upload.js
 *   node upload.js ./out /www/wwwroot/lang.64hz.cn
 *   node upload.js --dry-run
 *
 * Options can be provided by .env or environment variables:
 *   SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD, SFTP_KEY_PATH,
 *   SFTP_PRIVATE_KEY, SFTP_PASSPHRASE
 *   SFTP_LOCAL_DIR, SFTP_REMOTE_DIR
 *   SFTP_CONNECTIONS (default 8), SFTP_FILES_PER_CONNECTION (default 4)
 *
 * Or by command line flags:
 *   node upload.js --host 8.153.161.157 --user root --password xxx
 *   node upload.js --connections 12 --files-per-connection 4
 *   node upload.js --dry-run              report what would change, change nothing
 *
 * The site stays up while this runs. Each file is written under a temporary name and renamed over the old
 * one, so nobody is served half a file; the `_next` assets go up before the pages that load them; and what the
 * new export no longer has is deleted only after everything else is on the server and its size checked.
 * Several SSH connections upload at once, several files on each, and a large file is split into ranges that
 * are written over all of them.
 */
const Client = require("ssh2-sftp-client");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

/**
 * Names the prune step must never delete. These are server-managed and are not
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
const booleanFlags = new Set(["dry-run"]);

/** A file above this size is split into ranges, so one connection does not carry it alone. */
const rangeThreshold = 4 * 1024 * 1024;
const rangeSize = 1024 * 1024;
/** One WRITE request: below the 34000-byte packet every SFTP server accepts. */
const pieceSize = 30 * 1024;
/** WRITE requests one file keeps in flight, so a distant server is not waited on once per piece. */
const piecesInFlight = 16;
/** A task that fails this many times fails the upload. */
const maxAttempts = 5;
/** A connection with requests outstanding and no answer for this long is taken for dead and reopened. */
const stallLimit = 120 * 1000;
/** No task finished and no byte acknowledged anywhere for this long fails the upload instead of hanging it. */
const idleLimit = 10 * 60 * 1000;
/** SFTP status codes, as ssh2 reports them in `error.code`. */
const noSuchFile = 2;

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
		if (booleanFlags.has(key) || !next || next.startsWith("--")) {
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

function readCount(options, key, envName, fallback) {
	const value = Number(readOption(options, key, envName, String(fallback)));
	if (!Number.isInteger(value) || value < 1) {
		throw new Error(`--${key} / ${envName} must be a positive integer`);
	}

	return value;
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
		// A lossy link can take a while to finish the handshake. There is no SSH keepalive: its ping waits
		// behind the data already queued on the connection, which on a slow link takes longer than any sane
		// keepalive limit. A connection that stops answering is caught by `stallLimit` instead.
		readyTimeout: 60000,
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const remotePath = (remoteDir, rel) => (rel ? path.posix.join(remoteDir, rel) : remoteDir);
const megabytes = (bytes) => (bytes / 1024 / 1024).toFixed(1);
const depthOf = (rel) => rel.split("/").length;

function formatRate(bytesPerSecond) {
	return bytesPerSecond >= 1024 * 1024
		? `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`
		: `${Math.round(bytesPerSecond / 1024)} KB/s`;
}

function formatDuration(seconds) {
	if (!Number.isFinite(seconds)) {
		return "--:--";
	}

	const whole = Math.max(0, Math.round(seconds));
	const minutes = Math.floor(whole / 60);
	return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Requests waiting for an answer on one channel, and since when the channel has had nothing to say: the only
 * sign that tells a slow connection from a dead one.
 */
class Tracker {
	constructor() {
		this.pending = 0;
		this.since = Date.now();
	}

	sent() {
		if (this.pending === 0) {
			this.since = Date.now();
		}

		this.pending += 1;
	}

	answered() {
		this.pending -= 1;
		this.since = Date.now();
	}

	stalled() {
		return this.pending > 0 && Date.now() - this.since > stallLimit;
	}
}

const trackers = new WeakMap();

/** ssh2 accepts a request on a closed channel without a word, and never answers it. */
function isOpen(channel) {
	return channel.readable !== false && (channel.outgoing?.state ?? "open") === "open";
}

/** Call a callback-style method of ssh2's SFTP channel; a synchronous throw rejects as well. */
function call(channel, method, ...args) {
	return new Promise((resolve, reject) => {
		if (!isOpen(channel)) {
			reject(new Error("Channel closed"));
			return;
		}

		const tracker = trackers.get(channel);
		tracker?.sent();
		try {
			channel[method](...args, (error, result) => {
				tracker?.answered();
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			});
		} catch (error) {
			tracker?.answered();
			reject(error);
		}
	});
}

/** A retried delete may find its target already gone: the first attempt worked and only the answer was lost. */
function ignoreMissing(error) {
	if (error.code !== noSuchFile) {
		throw error;
	}
}

function groupByDepth(rels, deepestFirst) {
	const levels = new Map();
	for (const rel of rels) {
		const depth = depthOf(rel);
		levels.set(depth, [...(levels.get(depth) ?? []), rel]);
	}

	return [...levels.keys()].sort((a, b) => (deepestFirst ? b - a : a - b)).map((depth) => levels.get(depth));
}

function walkLocal(root) {
	const files = [];
	const dirs = [];
	const visit = (rel) => {
		for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
			const child = rel ? `${rel}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				dirs.push(child);
				visit(child);
			} else if (entry.isFile()) {
				files.push({ rel: child, size: fs.statSync(path.join(root, child)).size });
			}
		}
	};

	visit("");
	return { files, dirs };
}

/**
 * One SSH connection and its SFTP channel, reopened on demand after it drops. A task asks for the channel each
 * time it runs, so a task retried after a disconnect gets the new one.
 */
class Connection {
	constructor(index, config) {
		this.index = index;
		this.config = config;
		this.client = null;
		this.opening = null;
		this.broken = false;
		this.watchdog = setInterval(() => {
			const channel = this.client?.sftp;
			if (channel && trackers.get(channel)?.stalled()) {
				console.log(`Connection ${this.index} has not answered for ${stallLimit / 1000} s; reopening it`);
				// ending would wait for an answer as well; destroying fails every request still waiting
				this.dispose(true);
			}
		}, 5000);
	}

	channel() {
		if (this.client?.sftp) {
			return Promise.resolve(this.client.sftp);
		}

		if (this.broken) {
			return Promise.reject(new Error(`connection ${this.index} could not be reopened`));
		}

		this.opening ??= this.open().finally(() => {
			this.opening = null;
		});
		return this.opening;
	}

	async open() {
		for (let attempt = 1; ; attempt += 1) {
			this.dispose();
			// The library logs every close and error by default; a dropped connection is handled here instead.
			this.client = new Client(`upload-${this.index}`, { error() {}, end() {}, close() {} });
			try {
				await this.client.connect(this.config);
				trackers.set(this.client.sftp, new Tracker());
				return this.client.sftp;
			} catch (error) {
				if (attempt === 3) {
					this.broken = true;
					this.dispose();
					throw error;
				}

				await sleep(2000 * attempt);
			}
		}
	}

	/** A task saw the channel die before the library did: drop it, if it is still the current one. */
	drop(channel) {
		if (this.client?.sftp === channel) {
			this.dispose(true);
		}
	}

	dispose(force = false) {
		const client = this.client;
		this.client = null;
		if (force) {
			client?.client.destroy();
		} else if (client?.sftp) {
			return client.end().catch(() => undefined);
		} else {
			client?.client.end();
		}

		return Promise.resolve();
	}

	close() {
		clearInterval(this.watchdog);
		return this.dispose();
	}
}

/** What a request says when its channel closed under it, or before it was sent. */
const deadChannel = /No response from server|Channel closed|Not connected|ECONNRESET|EPIPE|socket/i;

async function openConnections(config, count) {
	const connections = Array.from({ length: count }, (_, index) => new Connection(index + 1, config));
	const results = await Promise.allSettled(connections.map((connection) => connection.channel()));
	const open = connections.filter((_, index) => results[index].status === "fulfilled");
	const failure = results.find((result) => result.status === "rejected");
	connections.filter((connection) => !open.includes(connection)).forEach((connection) => connection.close());

	if (open.length === 0) {
		throw failure.reason;
	}

	if (failure) {
		console.warn(`Only ${open.length} of ${count} connections opened: ${failure.reason.message}`);
	}

	return open;
}

/**
 * Run tasks on `lanesPerConnection` lanes per connection. A task may add more with `enqueue`. A failed task goes
 * back on the queue — for any lane to take, so a dead connection does not keep it — and fails the run on its last
 * attempt. A lane whose connection cannot be reopened stops; the others carry on. `activity` reports the last
 * time something moved inside a task, for tasks long enough to matter.
 */
async function runTasks(connections, lanesPerConnection, tasks, log, activity = () => 0) {
	const queue = [...tasks];
	let inFlight = 0;
	let fatal = null;
	let settled = Date.now();
	const enqueue = (task) => queue.push(task);

	const lane = async (connection) => {
		while (!fatal) {
			const task = queue.shift();
			if (!task) {
				if (inFlight === 0) {
					return;
				}

				await sleep(100);
				continue;
			}

			inFlight += 1;
			try {
				let channel;
				try {
					channel = await connection.channel();
				} catch (error) {
					queue.unshift(task);
					log(`Connection ${connection.index} is gone: ${error.message}`);
					return;
				}

				try {
					await task.run(channel, enqueue);
					settled = Date.now();
				} catch (error) {
					settled = Date.now();
					if (deadChannel.test(error.message)) {
						connection.drop(channel);
					}

					task.attempts = (task.attempts ?? 0) + 1;
					if (task.attempts >= maxAttempts) {
						fatal ??= new Error(`${task.label}: ${error.message} (after ${task.attempts} attempts)`);
					} else {
						log(`Retry ${task.attempts}/${maxAttempts - 1} ${task.label}: ${error.message}`);
						queue.push(task);
						await sleep(500 * task.attempts);
					}
				}
			} finally {
				inFlight -= 1;
			}
		}
	};

	const lanes = [];
	for (let index = 0; index < connections.length * lanesPerConnection; index += 1) {
		lanes.push(lane(connections[index % connections.length]));
	}

	// The last resort: whatever got stuck, a job that has stopped moving fails instead of waiting forever.
	let watchdog;
	const idle = new Promise((_, reject) => {
		watchdog = setInterval(() => {
			if (Date.now() - Math.max(settled, activity()) > idleLimit) {
				fatal ??= new Error(`Nothing moved for ${idleLimit / 60000} minutes; giving up instead of hanging`);
				reject(fatal);
			}
		}, 5000);
	});

	try {
		await Promise.race([Promise.all(lanes), idle]);
	} finally {
		clearInterval(watchdog);
	}

	if (fatal) {
		throw fatal;
	}

	if (queue.length > 0) {
		throw new Error(`No connection left for ${queue.length} task(s)`);
	}
}

/** Upload progress: a line every ten seconds in a log, one line rewritten every second in a terminal. */
class Progress {
	constructor(totalFiles, totalBytes) {
		this.totalFiles = totalFiles;
		this.totalBytes = totalBytes;
		this.files = 0;
		this.bytes = 0;
		this.started = Date.now();
		this.lastActivity = this.started;
		this.samples = [[this.started, 0]];
		this.tty = Boolean(process.stdout.isTTY);
		this.timer = setInterval(() => this.print(), this.tty ? 1000 : 10000);
	}

	add(bytes) {
		this.bytes += bytes;
		this.lastActivity = Date.now();
	}

	fileDone() {
		this.files += 1;
		this.lastActivity = Date.now();
	}

	/** Bytes per second over the last 30 seconds, so the estimate follows the link as it is now. */
	rate() {
		const now = Date.now();
		this.samples.push([now, this.bytes]);
		while (this.samples.length > 2 && now - this.samples[0][0] > 30000) {
			this.samples.shift();
		}

		const [since, bytesThen] = this.samples[0];
		// a retry takes back the bytes of its failed attempt, which can make a short window negative
		return now > since ? Math.max(0, ((this.bytes - bytesThen) * 1000) / (now - since)) : 0;
	}

	line() {
		const rate = this.rate();
		const percent = this.totalBytes > 0 ? Math.floor((this.bytes / this.totalBytes) * 100) : 100;
		const eta = rate > 0 ? (this.totalBytes - this.bytes) / rate : Infinity;
		return (
			`${String(percent).padStart(3)}%  ${this.files}/${this.totalFiles} files  ` +
			`${megabytes(this.bytes)}/${megabytes(this.totalBytes)} MB  ${formatRate(rate)}  ETA ${formatDuration(eta)}`
		);
	}

	print() {
		if (this.tty) {
			process.stdout.write(`\r${this.line()}\x1b[K`);
		} else {
			console.log(this.line());
		}
	}

	log(message) {
		if (this.tty) {
			process.stdout.write("\r\x1b[K");
		}

		console.log(message);
	}

	stop() {
		clearInterval(this.timer);
		this.print();
		if (this.tty) {
			process.stdout.write("\n");
		}

		const seconds = (Date.now() - this.started) / 1000;
		console.log(`Uploaded ${this.files} files, ${megabytes(this.bytes)} MB in ${formatDuration(seconds)} (${formatRate(this.bytes / Math.max(seconds, 1))})`);
	}
}

/** Everything under the remote root: files with their sizes, directories, and the directories a preserved entry keeps. */
async function listRemote(connections, lanes, remoteDir) {
	const files = new Map();
	const dirs = new Set();
	const kept = new Set();

	const listTask = (rel) => ({
		label: `list ${rel || "."}`,
		run: async (channel, enqueue) => {
			const entries = await call(channel, "readdir", remotePath(remoteDir, rel));
			for (const { filename, attrs } of entries) {
				const child = rel ? `${rel}/${filename}` : filename;
				if (preserveList.has(filename)) {
					// never descend into a preserved directory — the whole subtree stays, and so does every
					// directory above it
					for (let dir = rel; dir && dir !== "."; dir = path.posix.dirname(dir)) {
						kept.add(dir);
					}
					continue;
				}

				if (attrs.isDirectory()) {
					dirs.add(child);
					enqueue(listTask(child));
				} else {
					files.set(child, attrs.size);
				}
			}
		},
	});

	await runTasks(connections, lanes, [listTask("")], console.log);
	return { files, dirs, kept };
}

async function removeEntries(connections, lanes, remoteDir, files, dirs) {
	await runTasks(
		connections,
		lanes,
		files.map((rel) => ({
			label: `delete ${rel}`,
			run: (channel) => call(channel, "unlink", remotePath(remoteDir, rel)).catch(ignoreMissing),
		})),
		console.log,
	);

	for (const level of groupByDepth(dirs, true)) {
		await runTasks(
			connections,
			lanes,
			level.map((rel) => ({
				label: `remove directory ${rel}`,
				run: (channel) => call(channel, "rmdir", remotePath(remoteDir, rel)).catch(ignoreMissing),
			})),
			console.log,
		);
	}
}

function printSome(title, rels) {
	if (rels.length === 0) {
		return;
	}

	console.log(title);
	for (const rel of rels.slice(0, 20)) {
		console.log(`  ${rel}`);
	}

	if (rels.length > 20) {
		console.log(`  … and ${rels.length - 20} more`);
	}
}

/** Keep up to `piecesInFlight` WRITE requests going until all of `data` is at `offset` in the open file. */
function writePieces(channel, handle, data, offset, onBytes) {
	return new Promise((resolve, reject) => {
		let sent = 0;
		let acknowledged = 0;
		let inFlight = 0;
		let failed = false;

		const tracker = trackers.get(channel);
		const fail = (error) => {
			if (!failed) {
				failed = true;
				reject(error);
			}
		};

		const pump = () => {
			while (!failed && inFlight < piecesInFlight && sent < data.length) {
				if (!isOpen(channel)) {
					fail(new Error("Channel closed"));
					return;
				}

				const start = sent;
				const length = Math.min(pieceSize, data.length - start);
				sent += length;
				inFlight += 1;
				tracker?.sent();
				try {
					channel.write(handle, data, start, length, offset + start, (error) => {
						inFlight -= 1;
						tracker?.answered();
						if (error) {
							fail(error);
							return;
						}

						acknowledged += length;
						onBytes(length);
						if (acknowledged === data.length) {
							resolve();
						} else {
							pump();
						}
					});
				} catch (error) {
					inFlight -= 1;
					tracker?.answered();
					fail(error);
				}
			}
		};

		if (data.length === 0) {
			resolve();
		} else {
			pump();
		}
	});
}

async function writeRemoteFile(channel, target, flags, data, offset, onBytes) {
	const handle = await call(channel, "open", target, flags);
	try {
		await writePieces(channel, handle, data, offset, onBytes);
	} catch (error) {
		await call(channel, "close", handle).catch(() => undefined);
		throw error;
	}

	await call(channel, "close", handle);
}

/** Put `from` in the place of `to` in one step, where the server can (OpenSSH's posix-rename). */
async function replace(channel, from, to) {
	try {
		await call(channel, "ext_openssh_rename", from, to);
	} catch (error) {
		if (!/does not support/.test(error.message)) {
			throw error;
		}

		await call(channel, "unlink", to).catch(ignoreMissing);
		await call(channel, "rename", from, to);
	}
}

function readRange(file, start, length) {
	const data = Buffer.alloc(length);
	const fd = fs.openSync(file, "r");
	try {
		fs.readSync(fd, data, 0, length, start);
	} finally {
		fs.closeSync(fd);
	}

	return data;
}

/**
 * The upload tasks of one file. A small file is one task. A large one is written in ranges into its temporary
 * name, which `prepare` creates before any range runs; the range that completes last queues the rename.
 */
function uploadTasks(localRoot, remoteDir, file, tag, progress) {
	const localFile = path.join(localRoot, file.rel);
	const target = remotePath(remoteDir, file.rel);
	const temporary = `${target}.${tag}.part`;
	const counted = (sent) => (bytes) => {
		sent.bytes += bytes;
		progress.add(bytes);
	};

	if (file.size <= rangeThreshold) {
		return {
			prepare: [],
			upload: [
				{
					label: `upload ${file.rel}`,
					size: file.size,
					run: async (channel) => {
						const sent = { bytes: 0 };
						try {
							await writeRemoteFile(channel, temporary, "w", fs.readFileSync(localFile), 0, counted(sent));
							await replace(channel, temporary, target);
						} catch (error) {
							progress.add(-sent.bytes);
							throw error;
						}

						progress.fileDone();
					},
				},
			],
		};
	}

	let rangesLeft = Math.ceil(file.size / rangeSize);
	const finish = {
		label: `rename ${file.rel}`,
		run: async (channel) => {
			try {
				await replace(channel, temporary, target);
			} catch (error) {
				// A retry after a rename that worked, whose answer got lost, finds no temporary file and the
				// target at its new size.
				const placed = await call(channel, "stat", target).catch(() => null);
				const leftover = await call(channel, "stat", temporary).catch(() => null);
				if (leftover || placed?.size !== file.size) {
					throw error;
				}
			}

			progress.fileDone();
		},
	};

	const ranges = [];
	for (let start = 0; start < file.size; start += rangeSize) {
		const length = Math.min(rangeSize, file.size - start);
		ranges.push({
			label: `upload ${file.rel} [${megabytes(start)}–${megabytes(start + length)} MB]`,
			size: length,
			run: async (channel, enqueue) => {
				const sent = { bytes: 0 };
				try {
					await writeRemoteFile(channel, temporary, "r+", readRange(localFile, start, length), start, counted(sent));
				} catch (error) {
					progress.add(-sent.bytes);
					throw error;
				}

				rangesLeft -= 1;
				if (rangesLeft === 0) {
					enqueue(finish);
				}
			},
		});
	}

	return {
		prepare: [
			{
				label: `create ${file.rel}`,
				run: async (channel) => {
					await writeRemoteFile(channel, temporary, "w", Buffer.alloc(0), 0, () => undefined);
				},
			},
		],
		upload: ranges,
	};
}

async function deploy(localDir, remoteDir, config, settings) {
	const resolvedLocalDir = path.resolve(localDir);
	const indexPath = path.join(resolvedLocalDir, "index.html");

	if (!fs.existsSync(indexPath)) {
		throw new Error(`Static export was not found: ${indexPath}. Run npm run build first.`);
	}

	assertSafeRemoteDir(remoteDir);

	const local = walkLocal(resolvedLocalDir);
	const localFiles = new Map(local.files.map((file) => [file.rel, file]));
	const localDirs = new Set(local.dirs);
	const totalBytes = local.files.reduce((sum, file) => sum + file.size, 0);
	console.log(`Local export: ${local.files.length} files, ${megabytes(totalBytes)} MB in ${resolvedLocalDir}`);

	const { connections: count, lanes } = settings;
	const connections = await openConnections(config, count);
	console.log(`Connected: ${config.host}:${config.port}, ${connections.length} connections × ${lanes} files in flight`);

	try {
		await ensureRemoteDir(connections[0].client, remoteDir);

		let started = Date.now();
		const before = await listRemote(connections, lanes, remoteDir);
		console.log(`Listed ${before.files.size} files in ${before.dirs.size} directories on the server (${formatDuration((Date.now() - started) / 1000)})`);

		// A server directory where the export has a file, or a server file where it has a directory, is in the
		// way of the upload and goes first, with everything under it.
		const blockingRoots = [...before.dirs].filter((rel) => localFiles.has(rel));
		const under = (rel) => blockingRoots.some((root) => rel === root || rel.startsWith(`${root}/`));
		const blockingFiles = [...before.files.keys()].filter((rel) => localDirs.has(rel) || under(rel));
		const blockingDirs = [...before.dirs].filter(under);
		const keptBlocker = blockingDirs.find((rel) => before.kept.has(rel));
		if (keptBlocker) {
			throw new Error(`${keptBlocker} is a directory holding a preserved entry on the server, but a file in the export`);
		}

		const missingDirs = local.dirs.filter((rel) => !before.dirs.has(rel));
		const staleNow = [...before.files.keys()].filter((rel) => !localFiles.has(rel) && !blockingFiles.includes(rel));

		if (settings.dryRun) {
			console.log("Dry run — nothing on the server is changed.");
			console.log(`  upload   ${local.files.length} files, ${megabytes(totalBytes)} MB`);
			console.log(`  create   ${missingDirs.length} directories`);
			console.log(`  replace  ${blockingFiles.length + blockingDirs.length} entries that changed between file and directory`);
			console.log(`  delete   ${staleNow.length} files the export does not have (as the server is now)`);
			printSome("Would delete:", staleNow);
			return;
		}

		if (blockingFiles.length + blockingDirs.length > 0) {
			printSome("Removing entries in the way of the upload:", [...blockingFiles, ...blockingDirs]);
			await removeEntries(connections, lanes, remoteDir, blockingFiles, blockingDirs);
		}

		for (const level of groupByDepth(missingDirs, false)) {
			await runTasks(
				connections,
				lanes,
				level.map((rel) => ({
					label: `create directory ${rel}`,
					run: async (channel) => {
						try {
							await call(channel, "mkdir", remotePath(remoteDir, rel));
						} catch (error) {
							// a retry after an answer that got lost finds the directory already there
							const stats = await call(channel, "stat", remotePath(remoteDir, rel)).catch(() => null);
							if (!stats?.isDirectory()) {
								throw error;
							}
						}
					},
				})),
				console.log,
			);
		}

		if (missingDirs.length > 0) {
			console.log(`Created ${missingDirs.length} directories`);
		}

		const tag = crypto.randomBytes(3).toString("hex");
		const progress = new Progress(local.files.length, totalBytes);
		try {
			const plans = local.files.map((file) => ({
				asset: file.rel.startsWith("_next/"),
				...uploadTasks(resolvedLocalDir, remoteDir, file, tag, progress),
			}));
			const bySize = (a, b) => b.size - a.size;
			const log = (message) => progress.log(message);
			const moved = () => progress.lastActivity;
			await runTasks(connections, lanes, plans.flatMap((plan) => plan.prepare), log);

			// The assets first: a new page names chunks that the old site does not have.
			progress.log("Uploading _next assets");
			await runTasks(connections, lanes, plans.filter((plan) => plan.asset).flatMap((plan) => plan.upload).sort(bySize), log, moved);
			progress.log("Uploading pages");
			await runTasks(connections, lanes, plans.filter((plan) => !plan.asset).flatMap((plan) => plan.upload).sort(bySize), log, moved);
		} finally {
			progress.stop();
		}

		started = Date.now();
		const after = await listRemote(connections, lanes, remoteDir);
		const wrong = local.files.filter((file) => after.files.get(file.rel) !== file.size);
		if (wrong.length > 0) {
			printSome("On the server with the wrong size, or missing:", wrong.map((file) => file.rel));
			throw new Error(`${wrong.length} uploaded file(s) did not arrive whole; nothing was deleted`);
		}

		console.log(`Checked ${local.files.length} files on the server (${formatDuration((Date.now() - started) / 1000)})`);

		const staleFiles = [...after.files.keys()].filter((rel) => !localFiles.has(rel));
		const staleDirs = [...after.dirs].filter((rel) => !localDirs.has(rel) && !after.kept.has(rel));
		if (staleFiles.length + staleDirs.length > 0) {
			printSome(`Deleting ${staleFiles.length} files and ${staleDirs.length} directories the export no longer has:`, [...staleFiles, ...staleDirs]);
			await removeEntries(connections, lanes, remoteDir, staleFiles, staleDirs);
		}

		console.log("Upload finished.");
	} finally {
		await Promise.race([Promise.all(connections.map((connection) => connection.close())), sleep(5000)]);
	}
}

async function main() {
	const { options, positional } = parseArgs(process.argv.slice(2));
	const localDir = positional[0] || readOption(options, "local-dir", "SFTP_LOCAL_DIR", defaultLocalDir);
	const remoteDir = positional[1] || readOption(options, "remote-dir", "SFTP_REMOTE_DIR", defaultRemoteDir);
	const config = buildConfig(options);
	const settings = {
		connections: readCount(options, "connections", "SFTP_CONNECTIONS", 8),
		lanes: readCount(options, "files-per-connection", "SFTP_FILES_PER_CONNECTION", 4),
		dryRun: options["dry-run"] === true,
	};

	if (!config.password && !config.privateKey) {
		console.warn("No SFTP password or private key was provided. SSH agent auth may be required.");
	}

	await deploy(localDir, remoteDir, config, settings);
}

// Exit explicitly: a connection that has not finished closing must not keep a CI job waiting.
main().then(
	() => process.exit(0),
	(error) => {
		console.error(error.message || error);
		process.exit(1);
	},
);
