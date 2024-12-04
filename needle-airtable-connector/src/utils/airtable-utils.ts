// utils.js
let latestTokenRequestState = { state: 'NONE' };

// Global cache to store authorization states temporarily
const authorizationCache = {};

// Functions to manage token request state
export function setLatestTokenRequestState(state, data) {
    latestTokenRequestState = { state, data };
}

export function formatLatestTokenRequestStateForDeveloper() {
    const { state, data } = latestTokenRequestState;
    let message = `<p>${state}</p>`;
    if (data) {
        message += `<pre><code>${JSON.stringify(data, null, 2)}</code></pre>`;
    }
    return message;
}

// Functions to manage authorization cache
export function addAuthorizationCache(state, data) {
    authorizationCache[state] = data;
}

export function getAuthorizationCache(state) {
    return authorizationCache[state];
}

export function deleteAuthorizationCache(state) {
    delete authorizationCache[state];
}

export function getAuthorizationAllCache() {
    return authorizationCache;
}