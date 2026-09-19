/**
 * Client TCP JSON-lines pour serina_daemon (voir docs/SERINA_DAEMON_PROTOCOL.md).
 * Une connexion persistante, une requête = une ligne JSON avec un id, une
 * réponse = une ligne JSON avec le même id -- les requêtes concurrentes pour
 * des simulations différentes se multiplexent sur la même socket sans se
 * marcher dessus.
 */

const net = require('net');
const { EventEmitter } = require('events');

const REQUEST_TIMEOUT_MS = 15000;

class DaemonClient extends EventEmitter {
  constructor(host, port) {
    super();
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = '';
    this.nextId = 1;
    this.pending = new Map();
    this.connected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let settled = false;

      socket.on('connect', () => {
        this.socket = socket;
        this.connected = true;
        settled = true;
        resolve();
      });

      socket.on('data', (chunk) => this._onData(chunk));

      socket.on('error', (err) => {
        if (!settled) {
          // Échec de la tentative de connexion initiale : le rejet de la
          // promesse suffit, l'appelant (SimulationEngine.initialize) le
          // gère déjà. Ne pas aussi émettre 'error' ici : EventEmitter
          // plante le process si personne n'écoute cet événement, et un
          // daemon qui n'est pas encore démarré est un cas attendu, pas une
          // erreur fatale.
          settled = true;
          reject(err);
          return;
        }
        // Erreur après une connexion déjà établie (coupure réseau, daemon
        // qui plante...) : là, un listener est garanti (voir le .on('error')
        // posé juste après le connect() réussi dans SimulationEngine), donc
        // la re-émettre est sûre.
        this.emit('error', err);
      });

      socket.on('close', () => {
        this.connected = false;
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error('serina_daemon connection closed'));
        }
        this.pending.clear();
        this.emit('close');
      });
    });
  }

  _onData(chunk) {
    this.buffer += chunk.toString('utf8');
    let idx;
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (!line.trim()) continue;

      let message;
      try {
        message = JSON.parse(line);
      } catch (err) {
        continue; // ligne malformée : on l'ignore plutot que de planter la connexion
      }

      const waiting = this.pending.get(message.id);
      if (waiting) {
        this.pending.delete(message.id);
        clearTimeout(waiting.timeout);
        waiting.resolve(message);
      }
    }
  }

  send(command, simulationId, extra = {}) {
    if (!this.connected || !this.socket) {
      return Promise.reject(new Error('Not connected to serina_daemon'));
    }

    const id = this.nextId++;
    const payload = { id, command, simulationId, ...extra };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`serina_daemon command '${command}' timed out`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timeout });

      this.socket.write(JSON.stringify(payload) + '\n', (err) => {
        if (err) {
          clearTimeout(timeout);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }

  close() {
    if (this.socket) this.socket.end();
    this.connected = false;
  }
}

module.exports = DaemonClient;
