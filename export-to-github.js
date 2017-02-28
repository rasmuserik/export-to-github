// <img src=https://export-to-github.solsort.com/icon.png width=96 height=96 align=right>
//
// [![website](https://img.shields.io/badge/website-export-to-github.solsort.com-blue.svg)](https://export-to-github.solsort.com/)
// [![github](https://img.shields.io/badge/github-solsort/export-to-github-blue.svg)](https://github.com/solsort/export-to-github)
// [![codeclimate](https://img.shields.io/codeclimate/github/solsort/export-to-github.svg)](https://codeclimate.com/github/solsort/export-to-github)
// [![travis](https://img.shields.io/travis/solsort/export-to-github.svg)](https://travis-ci.org/solsort/export-to-github)
// # Github export

exports.info = {
  title: 'export-to-github',
  version: '0.2.0',
};
var ss = require('solsort', {version: '0.2'});

// ## main
var muToken = location.hash.replace('#muBackendLoginToken=', '');
location.hash = '';
var ghToken;
var state;

ss.ready(() => {
  if(!muToken) {
    localStorage.setItem('route', JSON.stringify(ss.get('route')));
    location.href = 'https://mubackend.solsort.com/auth/github?url=' +
      location.href.replace(/[?#].*.?/, '') + '&scope=public_repo';
  } else {
    state =  JSON.parse(localStorage.getItem('route'));
    ss.set('route', state);
    print('Got token from muBackend');
    Promise.resolve()
      .then(loadSource)
      .then(githubToken)
      .then(getUser)
      .then(determineRepos)
      .then(getRepos)
      .then(checkLicense)
      .then(() => writeFile(state.name + '.js', state.code))
      .then(() => print(JSON.stringify(state, null, 4)))
      ;
  }
});

// ## writeFile(filename, data) -> fn() -> Promise

function writeFile(filename, content) {
  var file = state.reposContent.filter(o => o.name === filename)[0];
  print('Committing', filename, 'to GitHub');
  var message = {
    path: filename,
    content: btoa(content),
    message: 'Commit ' + filename +
      ' via https://appedit.solsort.com/?page=edit&github=' + 
      state.repos,
  };
  if(file.sha) {
    message.sha = file.sha;
  }
  return ghAjax('repos/' + state.repos + '/contents/' + filename,
      {data: JSON.stringify(message), method: 'PUT'});
}

// ## determineRepos

function determineRepos() {
  state.name = state.repos.split('/')[1];
}

// ## getRepos

function getRepos() {
  print('Getting github repos..');
  return ghAjax('repos/' + state.repos + '/contents/')
    .then(o => state.reposContent = o);
}

// ## checkLicense

function checkLicense() {
  print('Checking license (must be MIT or GPLv3 in free version)');
  return ghAjax('repos/' + state.repos + '/license')
    .then(o => {
      var license = (o.license || {}).spdx_id;
      if(!['MIT', 'GPL-3.0'].includes(license)) {
        print('Invalid license');
        throw new Error('Invalid license');
      }
      print('License OK');
    });
}

// ## loadSource

function loadSource() {
  print('Loading from code storage..');
  return ss.ajax(
      'https://code-storage.solsort.com/hash/' + state.sourceHash)
    .then(s => state.code = s)
    .then(s => sha1(s))
    .then(s => state.codeHash = s);
}

// ## sha1(str)

function sha1(str) {
  return crypto.subtle.digest('SHA-1', 
      (new Uint8Array(str.split('').map(s=>s.charCodeAt(0)))).buffer)
    .then(hash => ss.slice(new Uint8Array(hash)).map(n => (0x100+n).toString(16).slice(1)).join(''));
}

// ## githubToken

function githubToken() {
  print('Getting github token..');
  return ss.ajax(
      'https://mubackend.solsort.com/auth/result/' + muToken)
    .then(JSON.parse)
    .then(o => ghToken = o.token);
}

// ## getUser

function getUser() {
  print('Getting github user..');
  return ghAjax('user')
    .then(o => state.user = o.login);
}

// ## print

function print() {
  document.body.innerHTML += '<pre>' +
    ss.slice(arguments).map(o => typeof o === 'object' ? JSON.stringify(o) : o).join(' ').replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>';
  return arguments[0];
}

// ## ghAjax

function ghAjax(path, params) {
  return ss.ajax('https://api.github.com/' + path + 
      '?access_token=' + ghToken, params)
    .then(str => {
      try {
        return JSON.parse(str);
      } catch(e) {
        return str;
      }
    });

}

// # Old code / notes
/*
//
// ## Generate files for export

function makeFiles(source, meta) {
var files = [];
files.push({
name: meta.id + '.js',
content: source
});
if(!meta.customIndexHtml) {
files.push({
name: 'index.html',
content: makeIndexHtml(source, meta)
});
}
files.push({
name: 'README.md',
content: makeReadmeMd(source, meta)
});
if(meta.npm) {
files.push({
name: 'package.json',
content: JSON.stringify(Object.assign({
name: meta.id,
version: meta.version,
description: (meta.title || '') + (meta.description || '')
}, meta.npm), null, 4)
});
}
return files;
}

// It is useful to have the sha-1 of the files, when uploading to github, as we can use that to only upload those that have changed. The function below below just adds a sha property to all the file object.
//
function sha1files(files) {
return Promise.all(
files.map(o => new Promise((resolve, reject) =>
sha1(o.content).then(sha =>
resolve(Object.assign(o, {sha: sha}))))));
}

// ### Generate index.html from source

function makeIndexHtml(source, meta) {
return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${meta.title}</title>
<meta name="format-detection" content="telephone=no">
<meta name="msapplication-tap-highlight" content="no">
<meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<link rel=icon href=icon.png>
<link href="https://fonts.googleapis.com/css?family=Ubuntu" rel="stylesheet">
<body>
<div id=app>
${meta.splash ?
'<img src=' + meta.splash + ' width=100% height=100%>' :
markdown2html(makeReadmeMd(source, meta))}
</div>
<script src=https://unpkg.com/reun></script>
<script>document.write('<script src="//incoming.solsort.com/log.js?' + location.protocol + '//' + location.host + location.pathname + location.search + '" async></s' + 'cript>');</script>
<script>setTimeout(()=>reun.require('./${meta.id}.js'),0);</script>
</body>
`;
}

// ### Generate README.md from source

function makeReadmeMd(source, meta) {
  var user = meta.githubUser;
  var id = meta.id;
  var project = user + '/' + id;
  var s = `<img src=https://raw.githubusercontent.com/${project}/master/icon.png width=96 height=96 align=right>\n\n`;
  if(meta.url) {
    s+= '[![website](https://img.shields.io/badge/website-' +
        meta.url.replace(/.*[/][/]/, '').replace(/[/].*.?/, '') +
        `-blue.svg)](${meta.url})\n`;
  }
  s += `[![github](https://img.shields.io/badge/github-${project}-blue.svg)](https://github.com/${project})\n`;
  s+= `[![codeclimate](https://img.shields.io/codeclimate/github/${project}.svg)](https://codeclimate.com/github/${project})\n`;
  if(meta.travis) {
    s += `[![travis](https://img.shields.io/travis/${project}.svg)](https://travis-ci.org/${project})\n`;
  }
  if(meta.npm) {
    s += `[![npm](https://img.shields.io/npm/v/${id}.svg)](https://www.npmjs.com/package/${id})\n`;
  }
  s += js2markdown(source);
  return s;
}

