{
  function bufferToBase64(buffer) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
  }

  function base64ToBuffer(data) {
    return Uint8Array.from(atob(data), c => c.charCodeAt(0))
  }

  function concatTypedArrays(a, b) { // a, b TypedArray of same type
        var c = new (a.constructor)(a.length + b.length);
        c.set(a, 0);
        c.set(b, a.length);
        return c;
  }

  let encoder = new TextEncoder("utf-8");
  let decoder = new TextDecoder("utf-8");
  let keyPromise = new KeyStore().open().then(store => {
    return store.getKey('DynaCrypt');
  }).then(keyObject => {
    if (keyObject !== undefined)
      return keyObject.key;
    else
      return false;
  }).catch(e => {
    console.error('Error loading encryption key:', e);
  });

  function encrypt(msg) {
    return keyPromise.then(key => {
      if (key === false)
        return msg;
      let iv = window.crypto.getRandomValues(new Uint8Array(12));
      return window.crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, key, encoder.encode(msg)).then(result => {
        return bufferToBase64(concatTypedArrays(iv, new Uint8Array(result)));
      });
    }).catch(e => {
      console.error('Error while encrypting data', e.message);
    });
  }

  function prefixEncrypt(msg) {
    if (msg.startsWith('🔑')) {
      return Promise.resolve(msg);
    }
    return encrypt(msg).then(encrypted => {
      return '🔑' + encrypted;
    });
  }

  function mayDecrypt(msg) {
    if (msg.startsWith('🔑')) {
      return decrypt(msg.replace('🔑', '')).catch(e => {
        console.error('Error while decrypting data', e);
        return '🔑 Could not decrypt';
      });
    } else {
      return Promise.resolve(msg);
    }
  }

  function decrypt(msg) {
    return keyPromise.then(key => {
      if (key === false)
        return Promise.reject('No key available');
      let buffer = base64ToBuffer(msg);
      let iv = buffer.slice(0, 12);
      return window.crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, key, buffer.slice(12)).then(result => {
        return decoder.decode(result);
      });
    })
  }

  async function encryptBundle(bundle) {
    for (el of bundle) {
      if (el.path == '/api/doc/update') {
        let data = JSON.parse(el.data);
        if (!('diff2' in data) || data.diff2 == null)
          continue;
        let meta = data.diff2.meta;
        for (m of meta) {
          if (!('meta' in m))
            continue;
          let metaData = JSON.parse(m.meta);
          if ('c' in metaData)
            metaData.c = await prefixEncrypt(metaData.c);
          if ('n' in metaData)
            metaData.n = await prefixEncrypt(metaData.n);
          m.meta = JSON.stringify(metaData);
        }
        el.data = JSON.stringify(data);
      }
    }
    return bundle;
  }

  async function decryptBundle(bundle) {
    for (el of bundle) {
      if (el.path == '/api/doc/load') {
        let data = JSON.parse(el.data);
        data.title = await mayDecrypt(data.title);
        let nodes = data.nodes;
        for (n of nodes) {
          if (!n.meta)
            continue;
          n.meta = await decryptMeta(n.meta);
        }
        el.data = JSON.stringify(data);
      }
    }
    return bundle;
  }

  async function decryptMeta(meta) {
    if (!meta)
      return "";
    let metaData = JSON.parse(meta);
    if ('c' in metaData)
      metaData.c = await mayDecrypt(metaData.c);
    if ('n' in metaData)
      metaData.n = await mayDecrypt(metaData.n);
    return JSON.stringify(metaData);
  }

  async function decryptHistory(history) {
    for (diff of history.diffs) {
      if (!('meta' in diff))
        continue;
      for (metaEl of diff.meta) {
        if ('meta_new' in metaEl)
          metaEl.meta_new = await decryptMeta(metaEl.meta_new);
        if ('meta_old' in metaEl)
          metaEl.meta_old = await decryptMeta(metaEl.meta_old);
      }
    }
    return history;
  }

  xhook.before((request, callback) => {
    if (request.url.startsWith('/api')) {
      if (request.headers['Content-Type'] == 'application/octet-stream') {
        var body = LZString.decompressFromUint8Array(request.body);
      } else {
        var body = request.body;
      }
      //console.log('Request to', request.url, JSON.parse(body));
      if (request.url == '/api/bundle_binary') {
        encryptBundle(JSON.parse(body).bundle).then(encrypted => {
          request.body = LZString.compressToUint8Array(JSON.stringify({
            bundle: encrypted
          }));
          callback();
        }).catch(e => {
          console.error('Could not encrypt:', e.message);
          callback();
        });
        return;
      }
    }
    callback();
  });
  xhook.after((request, response, callback) => {
    if (response.status == 200) {
      try {
        var rep = JSON.parse(response.text);
      } catch(e) {
        callback();
        return;
      }
      //console.log('Response', request.url, rep);
      switch (request.url) {
        case '/api/bundle_binary':
          decryptBundle(rep.bundle).then(decrypted => {
            rep.bundle = decrypted
            response.text = JSON.stringify(rep);
            callback();
          }).catch(e => {
            console.error('Could not decrypt:', e);
            callback();
          });
          return;
        case '/api/doc/history':
          decryptHistory(rep).then(decrypted => {
            response.text = JSON.stringify(decrypted);
            callback();
          }).catch(e => {
            console.error('Could not decrypt:', e);
            callback();
          });
          return;
      }
    }
    callback();
  });
}
