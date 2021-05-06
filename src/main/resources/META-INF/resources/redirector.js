/*
 * Copyright (c) 2021 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */
const origin = window.location.origin;
const path = window.location.pathname;
const query = window.location.search;
const hash = window.location.hash;

console.log("Origin: ", origin);
console.log("Path: ", path);
console.log("Query: ", query);
console.log("Hash: ", hash);

// Link to the Developer Sandbox Registration Service which we store in the 'application.properties' / 'developer.sandbox.registration-service.url'.
const registrationServiceURL = origin + '/config'

var signupURL;
var configURL;
var idToken;

// Shows state content.
// Given Id needs to be one of 'loading-crw-text', 'register-developer-sandbox-text', 'error-text' or 'verify-account-text'.
function show(elementId) {
    console.log('showing element: ' + elementId);
    document.getElementById(elementId).style.display = 'block';
}

// Hides state content.
// Given Id needs to be one of 'loading-crw-text', 'register-developer-sandbox-text' or 'error-text'.
function hide(elementId) {
    console.log('hiding element: ' + elementId);
    document.getElementById(elementId).style.display = 'none';
}

// hides all state content.
function hideAll() {
  console.log('hiding all..');
  document.getElementById('loading-crw-text').style.display = 'none';
  document.getElementById('register-developer-sandbox-text').style.display = 'none';
  document.getElementById('verify-account-text').style.display = 'none';
  document.getElementById('error-text').style.display = 'none';
  document.getElementById('error-status').style.display = 'none';
}

function showError(errorText) {
  hideAll();
  show('error-text');
  show('error-status');
  document.getElementById('error-status').textContent = errorText;
}

function httpGetAsync(url, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}

// Loads json data from url, the callback is called with
// error and data, with data the parsed json.
var getJSON = function(method, url, token, callback, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    if (token != null)
        xhr.setRequestHeader('Authorization', 'Bearer ' + token)
    xhr.responseType = 'json';
    xhr.onload = function() {
        var status = xhr.status;
        if (status >= 200 && status < 300) {
            console.log('getJSON success: ' + url);
            callback(null, xhr.response);
        } else {
            console.log('getJSON error: ' + url);
            callback(status, xhr.response);
        }
    };
    if (body)
        xhr.send(JSON.stringify(body));
    else
        xhr.send();
};

// Redirects to the URL after 3 seconds
function redirect(url) {
    console.log("Redirect URL: ", url)
    setTimeout(function() {
        window.location.href = url;
    }, 3000);
}

// Generates the redirect URL to the right CRW instance with path, query and hash parameteres
function generateRedirectUrlFromSignupData(data) {
    let dashboardURL = data.cheDashboardURL;
    if (dashboardURL.endsWith("/")) {
        dashboardURL = dashboardURL.slice(0, -1);
    }
    return dashboardURL + path + query + hash;
}

// Gets the signup state
function getSignupState(cbSuccess, cbError) {
    getJSON('GET', signupURL, idToken, function(err, data) {
        if (err != null) {
            console.log('getSignup error..');
            cbError(err, data);
        } else {
            console.log('getSignup successful..');
            cbSuccess(data);
        }
    })
}

function refreshToken() {
    // if the token is still valid for the next 30 sec, it is not refreshed.
    console.log('check refreshing token..');
    keycloak.updateToken(30)
        .then(function(refreshed) {
            console.log('token refresh result: ' + refreshed);
        }).catch(function() {
            console.log('failed to refresh the token, or the session has expired');
        });
}

function login() {
    // TODO: Doe we need ``autoSignup` true ?
    // User clicked on Get Started. We can enable autoSignup after successful login now.
    window.sessionStorage.setItem('autoSignup', 'true');
    keycloak.login()
}

// this loads the js library at location 'url' dynamically and
// calls 'cbSuccess' when the library was loaded successfully
// and 'cbError' when there was an error loading the library.
function loadAuthLibrary(url, cbSuccess, cbError) {
    var script = document.createElement('script');
    script.setAttribute('src', url);
    script.setAttribute('type', 'text/javascript');
    var loaded = false;
    var loadFunction = function() {
        if (loaded) return;
        loaded = true;
        cbSuccess();
    };
    var errorFunction = function(error) {
        if (loaded) return;
        cbError(error)
    };
    script.onerror = errorFunction;
    script.onload = loadFunction;
    script.onreadystatechange = loadFunction;
    document.getElementsByTagName('head')[0].appendChild(script);
}

// updates the signup state.
function updateSignupState() {
    console.log('updating signup state..');
    getSignupState(function(data) {
        console.log(JSON.stringify(data));
        if (data && data.cheDashboardURL) {
            let url = generateRedirectUrlFromSignupData(data);
            show("loading-crw-text");
            redirect(url);
        } else if (data && data.status.verificationRequired) {
            hideAll();
            show("verify-account-text");
            redirect('https://developers.redhat.com/developer-sandbox/ide');
        } else {
            showError("Failed to load data from the Developer Sandbox Registration service");
        }
    }, function(err, data) {
        if (err === 404) {
            console.log('error 404 - User has not been regestred in the Developer Sandbox. Redirecting to the landing...');
            show("register-developer-sandbox-text");
            redirect('https://developers.redhat.com/developer-sandbox/ide');
        } else if (err === 401) {
            console.log('error 401');
            showError(err);
        } else {
            // some other error
            console.log(err);
            showError(err);
        }
    })
}

function loadDataFromRegistrationService(registrationServiceBaseURL) {
    // this is where the Registration Services stores SSO / keycloak configuration
    configURL = registrationServiceBaseURL + '/api/v1/authconfig';
    signupURL = registrationServiceBaseURL + '/api/v1/signup';

    getJSON('GET', configURL, null, function(err, data) {
        if (err !== null) {
            console.log('error loading client config' + err);
            showError(err);
        } else {
            loadAuthLibrary(data['auth-client-library-url'], function() {
                console.log('client library load success!')
                var clientConfig = JSON.parse(data['auth-client-config']);
                console.log('using client configuration: ' + JSON.stringify(clientConfig))
                keycloak = Keycloak(clientConfig);
                keycloak.init({
                    onLoad: 'check-sso',
                    silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
                }).success(function(authenticated) {
                    if (authenticated == true) {
                        console.log('user is authenticated');
                        // start 15s interval token refresh.
                        intervalRefRefresh = setInterval(refreshToken, 15000);
                        keycloak.loadUserInfo()
                            .success(function(data) {
                                console.log('retrieved user info..');
                                idToken = keycloak.idToken;
                                // showUser(data.preferred_username)
                                // now check the signup state of the user.
                                updateSignupState();
                            })
                            .error(function() {
                                console.log('Failed to pull in user data');
                                showError('Failed to pull in user data.');
                            });
                    } else {
                        console.log('User not authenticated - initiating the login process');
                        setTimeout(function() {
                            login(); // Initiating the login process after 3 seconds
                        }, 3000);
                    }
                }).error(function() {
                    console.log('Failed to initialize authorization');
                    showError('Failed to initialize authorization.');
                });
            }, function(err) {
                console.log('error loading client library' + err);
                showError(err);
            });
        }
    });
}

httpGetAsync(registrationServiceURL, loadDataFromRegistrationService);
