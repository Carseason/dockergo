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
			'style': 'display:block;width:100%;height:calc(100vh - 110px);min-height:680px;border:0;border-radius:8px;background:#f5f7fb'
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
