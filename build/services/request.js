"use strict";
function request(method, url) {
    return fetch(url, {
        method: method || 'GET'
    });
}
