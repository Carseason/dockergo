'use strict';
'require rpc';
'require view';

const callListContainers = rpc.declare({
	object: 'luci.dockergo',
	method: 'list'
});

const callControlContainer = rpc.declare({
	object: 'luci.dockergo',
	method: 'control',
	params: [ 'id', 'action' ]
});

const callInspectContainer = rpc.declare({
	object: 'luci.dockergo',
	method: 'inspect',
	params: [ 'id' ]
});

return view.extend({
	render: function() {
		window.DockerGoLuci = Object.freeze({
			listContainers: callListContainers,
			inspectContainer: callInspectContainer,
			controlContainer: callControlContainer
		});

		return E('iframe', {
			'id': 'dockergo-app',
			'src': L.resource('dockergo/app/index.html'),
			'title': _('DockerGo'),
			'style': 'display:block;box-sizing:border-box;width:100%;max-width:100%;height:calc(100vh - 110px);height:calc(100dvh - 110px);min-height:0;border:0;background:#f5f7fb'
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
