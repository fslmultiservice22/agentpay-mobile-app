'use strict';

// Test-process guard only. Synthetic fetch implementations stay in the VM tests.
const fail = () => { throw new Error('AUDIT_NETWORK_BLOCKED'); };
require('node:net').Socket.prototype.connect = fail;
require('node:http').request = fail;
require('node:http').get = fail;
require('node:https').request = fail;
require('node:https').get = fail;
require('node:dns').lookup = fail;
globalThis.fetch = fail;
