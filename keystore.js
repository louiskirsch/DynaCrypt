// Key Storage with Web Cryptography API
//
// Copyright 2014 Info Tech, Inc.
// Modified 2020 Louis Kirsch
// Provided under the MIT license.
// See LICENSE file for details.

// Saves cryptographic key pairs in IndexedDB.

// The only global name in this library is openKeyStore.
// openKeyStore takes no parameters, and returns a Promise.
// If the key storage database can be opened, the promise
// is fulfilled with the value of a key store object. If
// it cannot be opened, it is rejected with an Error.
//
// The key store object has methods getKey, saveKey, listKeys
// to manage stored keys, and close, to close the key storage
// database, freeing it for other code to use.
//
// The key storage database name is hard coded as KeyStore. It
// uses one object store, called keys.
//
function KeyStore() {
    "use strict";
    var self = this;
    self.db = null;
    self.dbName = "KeyStore";
    self.objectStoreName = "keys";

    self.open = function() {
        return new Promise(function(fulfill, reject) {
            if (!window.indexedDB) {
                reject(new Error("IndexedDB is not supported by this browser."));
            }

            var req = indexedDB.open(self.dbName, 1);
            req.onsuccess = function(evt) {
                self.db = evt.target.result;
                fulfill(self);
            };
            req.onerror = function(evt) {
                reject(evt.error);
            };
            req.onblocked = function() {
                reject(new Error("Database already open"));
            };

            // If the database is being created or upgraded to a new version,
            // see if the object store and its indexes need to be created.
            req.onupgradeneeded = function(evt) {
                self.db = evt.target.result;
                if (!self.db.objectStoreNames.contains(self.objectStoreName)) {
                    var objStore = self.db.createObjectStore(self.objectStoreName, {keyPath: 'name'});
                }
            };
        });
    };

    // saveKey method
    //
    // Returns a Promise. If a key can be saved, the
    // Promise is fulfilled with a copy of the object
    // that was saved. Otherwise, it is rejected with an Error.
    //
    self.saveKey = function(key, name) {
        return new Promise(function(fulfill, reject) {
            if (!self.db) {
                reject(new Error("KeyStore is not open."));
            }

            var savedObject = {
                key: key,
                name: name,
            };

            var transaction = self.db.transaction([self.objectStoreName], "readwrite");
            transaction.onerror = function(evt) {reject(evt.error);};
            transaction.onabort = function(evt) {reject(evt.error);};
            transaction.oncomplete = function(evt) {fulfill(savedObject);};

            var objectStore = transaction.objectStore(self.objectStoreName);
            var request = objectStore.put(savedObject);
        });
    };

    self.clear = function() {
        return new Promise(function(fulfill, reject) {
            if (!self.db) {
                reject(new Error("KeyStore is not open."));
            }

            var transaction = self.db.transaction([self.objectStoreName], "write");
            transaction.onerror = function(evt) {reject(evt.error);};
            transaction.onabort = function(evt) {reject(evt.error);};
            transaction.oncomplete = function(evt) {fulfill();};

            var objectStore = transaction.objectStore(self.objectStoreName);
            var request = objectStore.clear();
        });
    };

    // getKey method
    //
    // Returns a Promise. If a key with the given propertyValue 
    // exists in the database, the Promise
    // is fulfilled with the saved object, otherwise it is rejected
    // with an Error.
    //
    // If there are multiple objects with the requested propertyValue,
    // only one of them is passed to the fulfill function.
    //
    self.getKey = function(propertyValue) {
        return new Promise(function(fulfill, reject) {
            if (!self.db) {
                reject(new Error("KeyStore is not open."));
            }

            var transaction = self.db.transaction([self.objectStoreName], "readonly");
            var objectStore = transaction.objectStore(self.objectStoreName);

            var request = objectStore.get(propertyValue);

            request.onsuccess = function(evt) {
                fulfill(evt.target.result);
            };

            request.onerror = function(evt) {
                reject(evt.target.error);
            };
        });
    };


    // listKeys method
    //
    // Takes no parameters.
    //
    // Returns a Promise. Unless there is an error, fulfills the
    // Promise with an array of all objects from the key storage
    // database. Otherwise it rejects it with an Error.
    //
    self.listKeys = function() {
        return new Promise(function(fulfill, reject) {
            if (!self.db) {
                reject(new Error("KeyStore is not open."));
            }

            var list = [];

            var transaction = self.db.transaction([self.objectStoreName], "readonly");
            transaction.onerror = function(evt) {reject(evt.error);};
            transaction.onabort = function(evt) {reject(evt.error);};

            var objectStore = transaction.objectStore(self.objectStoreName);
            var cursor = objectStore.openCursor();

            cursor.onsuccess = function(evt) {
                if (evt.target.result) {
                    list.push({id: evt.target.result.key, value: evt.target.result.value});
                    evt.target.result.continue();
                } else {
                    fulfill(list);
                }
            }
        });
    };


    // close method
    //
    // Takes no parameters.
    //
    // Simply closes the database and returns immediately. Note that
    // the IndexedDB system actually closes the database in a separate
    // thread, and there is no way to know when that process is complete.
    //
    self.close = function() {
        return new Promise(function(fulfill, reject) {
            if (!self.db) {
                reject(new Error("KeyStore is not open."));
            }

            self.db.close();
            self.db = null;
            fulfill();
        });
    };
}
