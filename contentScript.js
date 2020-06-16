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
    sendResponse({success: true});
    window.location.reload();
  }).catch(e => {
    sendResponse({success: false});
    console.error("Error while importing key", e);
  });
  return true;
});

function importKey(password) {
  let encoder = new TextEncoder("utf-8");
  let decoder = new TextDecoder("utf-8");
  return window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {"name": "PBKDF2"},
    false,
    ["deriveKey"]
  ).then(function(importedPassword) {
    let salt = encoder.encode("ThisIsTheDynaCryptSalt")
    return window.crypto.subtle.deriveKey(
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
  }).then(function(key) {
    let keystore = new KeyStore();
    return keystore.open().then(store => {
      return store.saveKey(key, 'DynaCrypt');
    });
  });
}
