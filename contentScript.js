function inject(name) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(name);
  s.onload = function() {
      this.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}
inject('xhook.js');
inject('keystore.js');
inject('lz-string.js');
inject('inject.js');

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  importKey(request.password).then(m => {
    sendResponse(m);
    window.location.reload();
  }).catch(e => {
    console.error("Error while importing key", e);
  });
  return true;
});

function bufferToBase64(buffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
}

function base64ToBuffer(data) {
  return Uint8Array.from(atob(data), c => c.charCodeAt(0))
}

function importKey(password) {
  let encoder = new TextEncoder("utf-8");
  let decoder = new TextDecoder("utf-8");
  return window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {"name": "PBKDF2"},
    false,
    ["deriveKey", "deriveBits"]
  ).then(function(importedPassword) {
    let salt = encoder.encode("TODO find the salt")
    let key =  window.crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        "salt": salt,
        "iterations": 2000,
        "hash": "SHA-256"
      },
      importedPassword,
      {
        "name": "AES-GCM",
        "length": 256
      },
      false,
      ["encrypt", "decrypt"]
    );
    let iv = window.crypto.subtle.deriveBits(
      {
        "name": "PBKDF2",
        salt: salt,
        iterations: 2000,
        hash: "SHA-256"
      },
      importedPassword,
      256
    );
    return Promise.all([key, iv]);
  }).then(function([key, iv]) {
    window.localStorage.setItem('DynaCrypt_iv', bufferToBase64(iv));
    let keystore = new KeyStore();
    return keystore.open().then(store => {
      return store.saveKey(key, 'DynaCrypt');
    });
  });
}
