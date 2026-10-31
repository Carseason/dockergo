'use strict';
'require rpc';
'require view';

const callListContainers = rpc.declare({
	object: 'luci.dockergo',
	method: 'list'
});

return view.extend({
	render: function() {
		window.DockerGoLuci = Object.freeze({
			listContainers: callListContainers
		});

		return E('iframe', {
			'id': 'dockergo-app',
			'src': L.resource('dockergo/app/index.html'),
			'title': _('DockerGo'),
			'style': 'position:fixed;inset:0;z-index:1000;display:block;width:100vw;height:100vh;height:100dvh;border:0;background:#f5f7fb'
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
