require.config({
  // make components more sensible
  // expose jquery 
  paths: {
    "components": "../components",
    "jquery": "../components/jquery/jquery",
    "socket.io": "../components/socket.io-client/dist/socket.io",
    "codemirror": "../components/codemirror"
  },

  shim: {
    "socket.io-client": {
      exports: 'io'
    },
    "codemirror/lib/codemirror": {
      exports: 'CodeMirror'
    },
    "codemirror/mode/xml/xml": ["codemirror/lib/codemirror"],
    "codemirror/mode/javascript/javascript": ["codemirror/lib/codemirror"],
    "codemirror/mode/htmlmixed/htmlmixed": ["codemirror/lib/codemirror"]
  }

});

if (!window.requireTestMode) {
  require(['main'], function(){ });
}


