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
            console.log('A peer wants to connect:', conn.peer);
            this.setupConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            alert(`An error occurred: ${err.message}`);
        });
    }

    createGame() {
        this.isHost = true;
        this.initialize(this.dataHandler); // Let PeerJS generate an ID
    }

    joinGame(hostId) {
        this.isHost = false;
        this.hostId = hostId;
        this.initialize(this.dataHandler); // Let PeerJS generate an ID for the peer

        this.peer.on('open', () => {
            const conn = this.peer.connect(hostId, { metadata: { peerId: this.myId }, reliable: true });
            this.setupConnection(conn);
        });
    }

    setupConnection(conn) {
        conn.on('open', () => {
            console.log(`Connection to ${conn.peer} opened.`);
            this.connections[conn.peer] = conn;
            if (this.isHost) {
                const newPeerId = conn.metadata.peerId;
                this.playerList.push(newPeerId);
                const updateMsg = { type: 'PLAYER_LIST_UPDATE', players: this.playerList };
                this.broadcast(updateMsg);
                this.dataHandler(updateMsg);
            }
        });

        conn.on('data', (data) => {
            if (this.dataHandler) {
                this.dataHandler(data, conn.peer);
            }
        });

        conn.on('close', () => {
            console.log(`Connection to ${conn.peer} closed.`);
            const closedPeerId = conn.metadata.peerId;
            delete this.connections[conn.peer];
            if (this.isHost) {
                this.playerList = this.playerList.filter(p => p !== closedPeerId);
                const updateMsg = { type: 'PLAYER_LIST_UPDATE', players: this.playerList };
                this.broadcast(updateMsg);
                this.dataHandler(updateMsg);
            }
        });
    }

    sendTo(peerId, data) {
        const conn = this.connections[peerId];
        if (conn && conn.open) {
            conn.send(data);
        }
    }

    broadcast(data) {
        console.log('Broadcasting:', data, 'to', Object.keys(this.connections));
        for (const peerId in this.connections) {
            this.sendTo(peerId, data);
        }
    }
}
