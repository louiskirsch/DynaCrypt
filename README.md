# DynaCrypt
Encrypts Dynalist Content using a Google Chrome plugin.

Also see Dynalist forum: https://talk.dynalist.io/t/dynacrypt-client-side-encryption-via-chrome-plugin/6820

**Disclaimer:
I do not take any responsibility for the security of this extension or any data loss due to bugs or mishandling of passwords.
The extension is NOT production ready and has still to be through-roughly tested.**

How it works:
It hijacks the XHR communication between the dynalist client and the dynalist server. All outgoing items are encrypted, all incoming items are decrypted.

## What is still missing

* Quick Dynalist support
* Support for bookmarks / document names
* Support for shared documents
* Support for dates in google calendar
* … something else?

## Usage

Just set your encryption password

<img src="https://talk.dynalist.io/uploads/default/original/2X/7/7e29589c7c7959d4cac54e0da4839ba16a64e869.png" width="300">

Then everything should look like normal Dynalist, but all new items are being encrypted.

If you deactivate the plugin you will see just this

<img src="https://talk.dynalist.io/uploads/default/original/2X/9/97e674fd56100501708427aa16fae289316dcec6.png" width="300">

With the plugin activated you will see the true content and everybody else (including the server and any hackers) will still see the above.

<img src="https://talk.dynalist.io/uploads/default/original/2X/d/da34b4a81f154cf98b5465807b58e7beb9e15dcb.png" width="300">
