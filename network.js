class Network {
    constructor() {
        this.peer = null;
        this.hostId = null;
        this.myId = null;
        this.connections = {};
        this.dataHandler = null;
        this.playerList = [];
        this.isHost = false;
    }

    initialize(dataHandler, peerId = undefined) {
        this.dataHandler = dataHandler;
        this.peer = new Peer(peerId);

        this.peer.on('open', (id) => {
            this.myId = id;
            console.log('My peer ID is: ' + id);
            if (this.isHost) {
                this.hostId = id;
                this.playerList = [this.myId];
                this.dataHandler({ type: 'HOST_ID_GENERATED', hostId: id });
            }
        });

        this.peer.on('connection', (conn) => {
            console.log('Incoming connection from:', conn.peer);
            this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            alert(`An error occurred: ${err.message}`);
        });
    }

    createGame() {
        this.isHost = true;
        this.initialize(this.dataHandler);
    }

    reinitialize(peerId, hostId = null) {
        this.isHost = (peerId === hostId);
        this.initialize(this.dataHandler, peerId);

        if (!this.isHost && hostId) {
            this.hostId = hostId;
            this.peer.on('open', () => {
                this.connectToHost(hostId);
            });
        }
    }

    connectToHost(hostId) {
        if (this.peer) {
            console.log(`Peer ${this.myId} attempting to connect to host ${hostId}`);
            const conn = this.peer.connect(hostId, { metadata: { peerId: this.myId }, reliable: true });
            this.setupConnection(conn);
        }
    }

    joinGame(hostId) {
        this.isHost = false;
        this.hostId = hostId;
        this.initialize(this.dataHandler);

        this.peer.on('open', () => {
            this.connectToHost(hostId);
        });
    }

    setupConnection(conn) {
        conn.on('open', () => {
            console.log(`Connection to ${conn.peer} opened.`);
            this.connections[conn.peer] = conn;

            if (this.isHost) {
                // Host logic: a new peer has connected.
                // Let the main script handle the logic of new vs reconnecting.
            } else {
                // Peer logic: we have connected to the host.
                // Request the game state to join or rejoin the game.
                console.log(`Peer ${this.myId} sending state request to host.`);
                conn.send({ type: 'REQUEST_GAME_STATE', peerId: this.myId });
            }
        });

        conn.on('data', (data) => {
            if (this.dataHandler) {
                this.dataHandler(data, conn.peer);
            }
        });

        conn.on('close', () => {
            console.log(`Connection to ${conn.peer} closed.`);
            delete this.connections[conn.peer];
            if (this.isHost) {
                // Let main script handle player drops
                this.dataHandler({type: 'PEER_DISCONNECTED', peerId: conn.peer });
            }
        });
    }

    sendTo(peerId, data) {
        const conn = this.connections[peerId];
        if (conn && conn.open) {
            conn.send(data);
        } else {
            console.warn(`No open connection to ${peerId} found.`);
        }
    }

    broadcast(data) {
        console.log('Broadcasting:', data.type, 'to', Object.keys(this.connections));
        for (const peerId in this.connections) {
            this.sendTo(peerId, data);
        }
    }
}
