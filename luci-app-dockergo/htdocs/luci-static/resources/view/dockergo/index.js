'use strict';
'require view';

function loadModule(src) {
	if (window.DockerGoMount)
		return Promise.resolve();

	return new Promise(function(resolve, reject) {
		const script = document.createElement('script');
		script.type = 'module';
		script.src = src;
		script.onload = resolve;
		script.onerror = function() {
			reject(new Error('无法加载 DockerGo 前端模块'));
		};
		document.head.appendChild(script);
	});
}

return view.extend({
	load: function() {
		return fetch(L.resource('dockergo/app/manifest.json'), { cache: 'no-store' })
			.then(function(response) {
				if (!response.ok)
					throw new Error('无法读取 DockerGo 构建清单');

				return response.json();
			})
			.then(function(manifest) {
				const entry = manifest['index.html'];
				if (!entry || !entry.file)
					throw new Error('DockerGo 构建清单缺少入口文件');

				const styles = (entry.css || []).map(function(file) {
					return fetch(L.resource('dockergo/app/' + file), { cache: 'no-store' })
						.then(function(response) {
							if (!response.ok)
								throw new Error('无法加载 DockerGo 样式');

							return response.text();
						});
				});

				return Promise.all([
					loadModule(L.resource('dockergo/app/' + entry.file)),
					Promise.all(styles)
				]);
			})
			.then(function(result) {
				return result[1].join('\n');
			});
	},

	render: function(styleText) {
		window.DockerGoConfig = Object.freeze({
			apiBase: L.url('admin/services/dockergo/api'),
			csrfToken: L.env.token
		});

		const host = E('div', {
			'id': 'dockergo-root',
			'style': 'display:block;width:100%;min-height:calc(100vh - 110px);background:#f5f7fb'
		});
		const shadow = host.attachShadow({ mode: 'open' });
		const style = document.createElement('style');
		const mount = document.createElement('div');
		style.textContent = styleText;
		mount.id = 'dockergo-app';
		shadow.appendChild(style);
		shadow.appendChild(mount);

		window.DockerGoMount(mount);
		this.mountNode = mount;

		return host;
	},

	unload: function() {
		if (this.mountNode && window.DockerGoUnmount)
			window.DockerGoUnmount(this.mountNode);

		this.mountNode = null;
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
