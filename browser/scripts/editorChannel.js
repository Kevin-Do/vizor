(function() {

function serialize(objects) {
	return objects.map(function(ob) {
		if (!ob)
			return ob;

		if (ob instanceof Graph)
			return ob.uid

		if (!ob.serialise) {
			return ob;
		}

		return ob.serialise()
	})
}

function serializeEvent(evt) {
	var otwMessage = {
		type: evt
	}

	var objects = Array.prototype.slice.call(arguments, 1)

	otwMessage.objects = serialize(objects)

	return otwMessage
}

function hydrate(pl) {
	var m = _.clone(pl)
	switch(m.actionType) {
		case 'uiNodeAdded':
			m.node = Node.hydrate(pl.graphUid, pl.node)
			break;
		case 'uiNodeRemoved':
		case 'uiNodeRenamed':
		case 'uiNodesMoved':
			break;
		case 'uiConnected':
			m.connection = Connection.hydrate(Graph.lookup(pl.graphUid), pl.connection)
			break;
		case 'uiDisconnected':
			break;
		case 'uiGraphTreeReordered':
		case 'uiPluginStateChanged':
			
	}

	// console.log('hydrated',m)
	return m;
}

function dehydrate(m) {
	var pl = _.clone(m)

	switch(m.actionType) {
		case 'uiNodeAdded':
			pl.node = m.node.serialise()
			break;
		case 'uiNodeRemoved':
		case 'uiNodeRenamed':
		case 'uiNodesMoved':
			break;
		case 'uiConnected':
			pl.connection = m.connection.serialise()
			break;
		case 'uiDisconnected':
			break;
		case 'uiGraphTreeReordered':
		case 'uiPluginStateChanged':
			
	}
	// console.log('dehydrated',pl)

	return pl;
}

function isAcceptedDispatch(m) {
	switch(m.actionType) {
		case 'uiNodeAdded':
		case 'uiNodeRemoved':
		case 'uiNodeRenamed':
		case 'uiNodesMoved':
		case 'uiConnected':
		case 'uiDisconnected':
		case 'uiGraphTreeReordered':
		case 'uiPluginStateChanged':
			return true;
	}

	console.log('NOT ACCEPTED:', m)

	return false;
}

function EditorChannel() {
	EventEmitter.call(this)

	var that = this

	this.channel = new WebSocketChannel()

	this.channel
		.connect('/__editorChannel')
		.on('ready', function() {
			that.emit('ready')
		})

	E2.app.dispatcher.register(function channelGotDispatch(payload) {
		if (payload.from)
			return;

		// console.log('EditorChannel.channelGotDispatch', payload)

		if (isAcceptedDispatch(payload))
			that.broadcast(dehydrate(payload))
	})

}

EditorChannel.prototype = Object.create(EventEmitter.prototype)

EditorChannel.prototype.join = function(channelName) {
	this.channelName = channelName
	this.channel.join(channelName)
	.on('*', function(payload) {
		if (!payload.actionType || !payload.from)
			return;

		// console.log('EditorChannel IN: ', payload.actionType, payload)

		if (isAcceptedDispatch(payload))
			E2.app.dispatcher.dispatch(hydrate(payload))
	})
}

EditorChannel.prototype.broadcast = function(payload) {
	this.channel.send(this.channelName, payload)
}

if (typeof(module) !== 'undefined')
	module.exports = EditorChannel
else
	window.EditorChannel = EditorChannel

})();