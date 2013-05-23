(function(window){

  function shell(content) {
    var lines = smartTrim( content ).split('\n')
    var container = $('<div>');
    var run = function(command) {
      var process = $.Deferred();
      var div = $('<div class="command">$ </div>');
      var chars = command.split('').slice(2);
      var index = 0;
      var print = function() {
        if (index++ < chars.length) {
          div[0].innerHTML += chars[index-1];
          setTimeout(print, 60);
        // done with output
        } else {
          process.resolve();
        }
      };
      container.append(div);
      setTimeout(print, 1000);
      return process.promise();
    };

    var feed = function(lines) {
      var process = $.Deferred();
      var div = $('<div class="ouput">');
      var index = 0;
      var print = function() {
        if ( index++ < lines.length) {
          div.append($('<pre class="line">').html(lines[index-1]));
          setTimeout(print, 420);
        } else {
          process.resolve();
        }
      };
      print();
      container.append(div);
      return process.promise();
    };

    var commands = [];
    $.each(lines, function(i, v) {
      var command;
      // command
      if ( /^\$/.test(v) ) {
        command = [];
        commands.push(command);
        command.push(v);
      } else {
        command = commands[commands.length-1];
        commands[commands.length-1].push(v);
      }
    });
    var printing = $.Deferred();
    var printingStep = printing.promise();

    $.each(commands, function(i, v) {
      printingStep = printingStep.then(function() {
        return run(v[0]).then(function() {
          return feed(v.slice(1));
        });
      });
    });
    printing.resolve();

    return $('<div class="CodeMirror shell">').append(container);
  };

  function smartTrim( content ) {
    // get rid of any whitespace followed by a new line or at the end
    content = content.replace( /^(\n|[ \t]+\n)/g, '' )
                     .replace( /(\n[ \t]+|\n)$/g, '' )
                     .replace( /\t/g, '  ' );
    var spaces = Infinity;
    var lines = content.split( "\n" );
    var rLeadSpace = /^\s+/;
    var match;

    for (var i = 0; i < lines.length; i++) {
      // get how many spaces prepend this line:
      match = rLeadSpace.exec(lines[i]);
      if (match && match[0]) {
        spaces = Math.min(spaces, match[0].length);
      }
    }
    // make a regex like /^    / for how many spaces
    return content.replace(new RegExp('^' + (new Array(spaces + 1)).join(' '), 'mg' ) , '');
  };
  window.yasd = function(action) {
    if (action == 'run') {
      // get script tags with type="text/x-code-run" or "text/x-background-run"
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if (/text\/x-\w+-run/.test(scripts[i].type)) {
          // make a script element
          var script = document.createElement('script');
          // put in the codez
          script.innerHTML = scripts[i].innerHTML;
          // append that bizniss
          document.body.appendChild(script);
        }
      }
      document.body.className += "loaded";
    }
    // parse code, do any other styles stuffs
    if (action == 'init') {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        var params = String(scripts[i].type).match(/text\/x-(html|code|shell|shell-output)(-run)?/);
        if (params) {
          // create an element after the script tag
          var container = $('<div>').insertAfter(scripts[i])
            .addClass(scripts[i].className + ' CodeMirror-container');
          // make a codemirror element form the script content
          var value = smartTrim( scripts[i].innerHTML ).replace(/\+script/g, 'script');
          var mode = "javascript";
          if (params[1] === "html") {
            mode = "htmlmixed";
          }
          if (params[1] === "shell") {
            container.append(shell(scripts[i].innerHTML));
            return;
          }

          var codeMirror = CodeMirror( container[0], {
              value: value,
              mode: mode,
              theme: 'monokai',
              lineNumbers: false,
              readOnly: false
          });
        }
      }
    }
    if (action == 'teardown') {
      document.body.className = "";
    }
  }
})(window);

$.extend($.easing,
{
	def: 'easeOutQuad',
	swing: function (x, t, b, c, d) {
		//alert($.easing.default);
		return $.easing[$.easing.def](x, t, b, c, d);
	},
	easeInQuad: function (x, t, b, c, d) {
		return c*(t/=d)*t + b;
	},
	easeOutQuad: function (x, t, b, c, d) {
		return -c *(t/=d)*(t-2) + b;
	},
	easeInOutQuad: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t + b;
		return -c/2 * ((--t)*(t-2) - 1) + b;
	},
	easeInCubic: function (x, t, b, c, d) {
		return c*(t/=d)*t*t + b;
	},
	easeOutCubic: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t + 1) + b;
	},
	easeInOutCubic: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t + b;
		return c/2*((t-=2)*t*t + 2) + b;
	},
	easeInQuart: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t + b;
	},
	easeOutQuart: function (x, t, b, c, d) {
		return -c * ((t=t/d-1)*t*t*t - 1) + b;
	},
	easeInOutQuart: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
		return -c/2 * ((t-=2)*t*t*t - 2) + b;
	},
	easeInQuint: function (x, t, b, c, d) {
		return c*(t/=d)*t*t*t*t + b;
	},
	easeOutQuint: function (x, t, b, c, d) {
		return c*((t=t/d-1)*t*t*t*t + 1) + b;
	},
	easeInOutQuint: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
		return c/2*((t-=2)*t*t*t*t + 2) + b;
	},
	easeInSine: function (x, t, b, c, d) {
		return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
	},
	easeOutSine: function (x, t, b, c, d) {
		return c * Math.sin(t/d * (Math.PI/2)) + b;
	},
	easeInOutSine: function (x, t, b, c, d) {
		return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
	},
	easeInExpo: function (x, t, b, c, d) {
		return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
	},
	easeOutExpo: function (x, t, b, c, d) {
		return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
	},
	easeInOutExpo: function (x, t, b, c, d) {
		if (t==0) return b;
		if (t==d) return b+c;
		if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
		return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
	},
	easeInCirc: function (x, t, b, c, d) {
		return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
	},
	easeOutCirc: function (x, t, b, c, d) {
		return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
	},
	easeInOutCirc: function (x, t, b, c, d) {
		if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
		return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
	},
	easeInElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
	},
	easeOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
	},
	easeInOutElastic: function (x, t, b, c, d) {
		var s=1.70158;var p=0;var a=c;
		if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
		if (a < Math.abs(c)) { a=c; var s=p/4; }
		else var s = p/(2*Math.PI) * Math.asin (c/a);
		if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
	},
	easeInBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*(t/=d)*t*((s+1)*t - s) + b;
	},
	easeOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
	},
	easeInOutBack: function (x, t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
		return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
	},
	easeInBounce: function (x, t, b, c, d) {
		return c - $.easing.easeOutBounce (x, d-t, 0, c, d) + b;
	},
	easeOutBounce: function (x, t, b, c, d) {
		if ((t/=d) < (1/2.75)) {
			return c*(7.5625*t*t) + b;
		} else if (t < (2/2.75)) {
			return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
		} else if (t < (2.5/2.75)) {
			return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
		} else {
			return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
		}
	},
	easeInOutBounce: function (x, t, b, c, d) {
		if (t < d/2) return $.easing.easeInBounce (x, t*2, 0, c, d) * .5 + b;
		return $.easing.easeOutBounce (x, t*2-d, 0, c, d) * .5 + c*.5 + b;
	}
});

// Mojax
// Copyright (c) 2011 Dan Heberden
// Dual licensed under the MIT and GPL A
var randomStrings = [ "Joe", "Bill", "Steve", "Mark", "Joanne", "Megan", "Kristy", "Suzie" ];
$.ajaxPrefilter( function( options, originalOptions, jqXHR ) {

    if ( /^\/?mock-ajax/.test( originalOptions.url ) ) {
        // make new deferred and save any success/error handlers
        var dfd = new $.Deferred(),
            success = options.success,
            error = options.error;
        
        // kill off the old handlers
        options.success = options.error = null;

        // map these promise methods onto the jqXHR
        dfd.promise( jqXHR );
        
        // simulate success and error
        dfd.done( function() {
           success && success.apply( options, arguments );         
        });
        dfd.fail( function(a,b,c) {
           error && error.apply( options, arguments );
        });
        
        var echo = originalOptions.data.echo || {},
            delay = originalOptions.data.delay || .05,
            status = originalOptions.data.status || true;
        if ( originalOptions.data.random ) {
          echo = randomStrings[ ~~(Math.random()*randomStrings.length) ];
        }
        
        // resolve the data
        setTimeout( function() {
            dfd[ status ? 'resolve' : 'reject' ]( echo, 'success', jqXHR );
        }, delay * 1000 );

        // abort out of this function, so the
        // promise still gets returned via $.ajax
        setTimeout(function(){
            jqXHR.abort( 'success' );
        },0);   
    }
    
   
});

