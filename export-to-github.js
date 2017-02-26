// <img src=https://export-to-github.solsort.com/icon.png width=96 height=96 align=right>
//
// [![website](https://img.shields.io/badge/website-export-to-github.solsort.com-blue.svg)](https://export-to-github.solsort.com/)
// [![github](https://img.shields.io/badge/github-solsort/export-to-github-blue.svg)](https://github.com/solsort/export-to-github)
// [![codeclimate](https://img.shields.io/codeclimate/github/solsort/export-to-github.svg)](https://codeclimate.com/github/solsort/export-to-github)
// [![travis](https://img.shields.io/travis/solsort/export-to-github.svg)](https://travis-ci.org/solsort/export-to-github)
//

exports.info = {
  title: 'export-to-github',
  version: '0.2.0',
};


var ss = require('solsort', {version: '0.2'});

var muToken = location.hash.replace('#muBackendLoginToken=', '');
location.hash = '';

ss.ready(() => {
if(!muToken) {
  localStorage.setItem('route', JSON.stringify(ss.get('route')));
  location.href = 'https://mubackend.solsort.com/auth/github?url=' +
    location.href.replace(/[?#].*.?/, '') + '&scope=public_repo';
} else {
ss.set('route', JSON.parse(localStorage.getItem('route')));
}
  ss.renderJsonml(['div', 'muToken: ', muToken], ss.bodyElem(Math.random()));
  ss.renderJsonml(['pre', JSON.stringify(ss.get('route'), null, 4)], 
      ss.bodyElem(Math.random()));
});
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

// ## Export to github


function exportToGithub() {
  location.href = 'https://mubackend.solsort.com/auth/github?url=' +
    location.href.replace(/[?#].*.?/, '') +
    '&scope=public_repo';
  localStorage.setItem('appeditAction', 'export');
  // https://developer.github.com/v3/oauth/#scopes
}

function loggedIn() {
  var ghurl = 'https://api.github.com';
  var token = location.hash.slice(21);
  var code = localStorage.getItem('appeditContent');
  var meta = JSON.parse(localStorage.getItem('appeditMeta'))[0];
  var username = '';
  var codeHash;
  var name = meta.id;
  var project;
  var dir;
  var localFiles;
  ajax('https://mubackend.solsort.com/auth/result/' + token)
    .then(o => {
      token = o.token;
      return ajax('https://api.github.com/user?access_token=' + token);
    }).then(u => {
      project = u.login + '/' + name;
      meta.githubUser = u.login;
      return sha1files(makeFiles(code, meta));
    }).then(files => {
      localFiles = files;
      return ajax('https://api.github.com/repos/' + project +
          '?access_token=' + token);
    }).then(o => {
      if(o.message === 'Not Found') {
        return ajax('https://api.github.com/user/repos' +
            '?access_token=' + token, { data: {
              name: name,
              auto_init: true,
              gitignore_template: 'Node',
              license_template: 'mit'
            }}).then(() => new Promise((resolve) =>
                setTimeout(resolve, 1000)));
      }
    }).then(() => {
      return ajax(`https://api.github.com/repos/${project}/license` +
          '?access_token=' + token);

    }).then(o => {
      var license = (o.license || {}).spdx_id;
      if(!['MIT', 'GPL-3.0'].includes(license)) {
        throw new Error('Invalid license');
      }
      return ajax(`https://api.github.com/repos/${project}/contents` +
          '?access_token=' + token);
    }).then(ghFiles => {
      console.log('here');
      var ghShas = {};
      for(var i = 0; i < ghFiles.length; ++i) {
        ghShas[ghFiles[i].name]  = ghFiles[i].sha;
      }
      var result = Promise.resolve();
      localFiles.map(f => {
        var ghSha = ghShas[f.name];
        if(ghSha === f.sha) {
          return;
        }
        var message = {
          path: f.name,
          content: btoa(f.content),
          message: `Commit ${f.name} via https://appedit.solsort.com/?Edit/js/gh/${project}.`
        };
        if(ghSha) {
          message.sha = ghSha;
        }
        var url = `https://api.github.com/repos/${project}/contents/${f.name}` +
          '?access_token=' + token;
        result = result.then(() => ajax(url, {method: 'PUT', data: message}));
      });
      return result;
    }).then(() => location.href =
      location.href.replace(/[?#].*.?/, '?' + localStorage.getItem('appeditAfterExport') || ''))
      .catch(e => {
        if(e.constructor === XMLHttpRequest &&
            e.status === 200) {
          exportToGithub();
        }
        console.log('apierror', e);
        throw e;
      });

    localStorage.setItem('appeditAction', '');
}

function ajax(url, opt) {
  opt = opt || {};
  opt.method = opt.method || (opt.data ? 'POST' : 'GET');
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(opt.method, url);
    xhr.onreadystatechange = function() {
      if(xhr.readyState === 4) {
        if(xhr.responseText) {
          var result = xhr.responseText;
          try {
            result = JSON.parse(xhr.responseText);
          } catch(e) {
            undefined;
          }
          resolve(result);
        } else {
          reject(xhr);
        }
      }
    };
    xhr.send(opt.data ? JSON.stringify(opt.data) : undefined);
  });
}

*/
