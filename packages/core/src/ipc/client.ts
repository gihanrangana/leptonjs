/**
 * LeptonJS Desktop — in-page IPC client (preload payload).
 *
 * Runs in the FRONTEND (the webview), injected by the native preload
 * (`WebViewBuilder::with_initialization_script`) BEFORE any page script runs,
 * so `window.__lepton` is defined before React mounts.
 *
 * The IPC base URL and auth token are NOT read from the page URL (the Vite dev
 * URL has no token). Instead they are baked in by the framework via the
 * `__LEPTON_IPC_URL__` and `__LEPTON_TOKEN__` placeholders, which
 * `buildPreloadScript(ipcUrl, token)` substitutes before injection. This makes
 * the client origin-agnostic: it works when the webview loads the Vite dev
 * server (cross-origin, needs dev CORS on the IPC server) or the prod IPC
 * server (same-origin).
 *
 * Frontend calls routes by string name. Compile-time route typing on the
 * frontend requires a shared routes package + a frontend bundler (the typed
 * importable client is a later sub-step of Phase 5).
 */

export const leptonClientScript = `(function () {
    var base = '__LEPTON_IPC_URL__';
    var token = '__LEPTON_TOKEN__';
    var pending = Object.create(null);
    var listeners = Object.create(null);
    var authHeaders = { 'x-lepton-token': token };

    function invoke(name, input) {
      return new Promise(function (resolve, reject) {
        var id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
        pending[id] = { resolve: resolve, reject: reject };

        fetch(base + '/__ipc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-lepton-token': token
          },
          body: JSON.stringify({ name: name, id: id, input: input })
        }).then(function (res) { return res.json(); }).then(function (msg) {
          var p = pending[id];
          if (!p) return;
          delete pending[id];
          if (msg.ok) p.resolve(msg.output); else p.reject(new Error(msg.error || 'ipc error'));
        }).catch(function (err) {
          var p = pending[id];
          if (p) { delete pending[id]; p.reject(err); }
        });
      });
    }

    function dispatch(name, data) {
      var cbs = listeners[name] || [];
      for (var i = 0; i < cbs.length; i++) cbs[i](data);
    }

    function parseFrame(frame) {
      var name = 'message';
      var data = '';
      var lines = frame.split('\\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf('event:') === 0) name = line.slice(6).trim();
        else if (line.indexOf('data:') === 0) data = line.slice(5).trim();
      }
      if (!data) return;
      var parsed = data;
      try { parsed = JSON.parse(data); } catch (e) {}
      dispatch(name, parsed);
    }

    function connectSse() {
      fetch(base + '/__sse', { headers: authHeaders }).then(function (res) {
        if (!res.ok || !res.body) throw new Error('sse ' + res.status);
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buf = '';
        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) {
              setTimeout(connectSse, 1000);
              return;
            }
            buf += decoder.decode(chunk.value, { stream: true });
            var parts = buf.split('\\n\\n');
            buf = parts.pop() || '';
            for (var i = 0; i < parts.length; i++) parseFrame(parts[i]);
            return pump();
          });
        }
        return pump();
      }).catch(function () {
        setTimeout(connectSse, 1000);
      });
    }

    connectSse();

    function listen(name, cb) {
      var arr = listeners[name] || (listeners[name] = []);
      arr.push(cb);
      return function unlisten() {
        var i = arr.indexOf(cb);
        if (i >= 0) arr.splice(i, 1);
      };
    }

    function subscribe(name, input, cb) {
        var id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

        fetch(base + '/__on', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-lepton-token': token },
            body: JSON.stringify({ name: name, id: id, input: input })
        });

        function wrapped(data) {
            if (!data || data.__sub !== id) return;
            cb(data.payload);
        }

        var stop = listen(name, wrapped);

        return function unsubscribe() {
            stop();
            fetch(base + '/__off', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-lepton-token': token },
            body: JSON.stringify({ id: id })
            });
        };
    }

    window.__lepton = { invoke: invoke, listen: listen, subscribe: subscribe };
  })();
`;
