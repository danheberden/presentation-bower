define([
  'jquery'
],
function(jQuery) {
  var $ = jQuery;

  Math.circularMod = function( value, mod ) {
      value %= mod;
      return value < 0 ? mod + value : value;
  };

  (function( $, document ) {

    // process the keydown event
    var handler = function( e, cache ){
              var el = this,
                  key = e.keyCode || e.which,
                  now = +new Date(),
                  mod = '';

              // ignore control keyes (shft,cntrl,opt,cmnd,caps)
              if ( ( key > 15 && key < 19 )  || key === 20 || key === 91 ||
                  // if we didn't ask to include inputs and didn't
                  // directly bind to the input-ish element
                    ( !cache.options.bubbleInputs && el !== e.target &&
                  // if we're in an input-ish item ( SELect, teXTArea, iNPut )
                    ( el.contentEditable === "true" || /(SEL|XTA|NP)/i.test( e.target.nodeName ) ) ) ) {
                  return;
              }

              // standard mod keys
              if ( e.altKey ) {
                mod += 'a';
              }
              if ( e.ctrlKey ) {
                 mod += 'c';
              }
              if ( e.metaKey ) {
                mod += 'm';
              }
              if ( e.shiftKey ) {
                mod += 's';
              }
              mod += key;

              if ( e.type === "keyup" ) {
                // un-flag state
                cache.state[ mod ] = false;

              } else {

                // flag state
                cache.state[ mod ] = true;
                 // it's been longer than our limit time since anything
                if (  now - cache.lastKeyTime > cache.options.time ) {
                  // kill any existing cache
                  cache.keyLog = [];
                }
                // update our lastKeyTime with right now to check on the
                // next keydown event
                cache.lastKeyTime = now;

                // tab magic (dont tab out)
                if ( key === 9 && cache.options.holdTab  ) {
                  e.preventDefault();
                }

                // check for a global handler (one that gets every keypress)
                if ( cache.actions[ '*' ] ) {
                  cache.actions[ '*' ].call( el, e, cache, mod );
                }
                // store into combo log
                cache.keyLog.unshift( mod );

                // truncate the array if it's too long
                if ( cache.keyLog.length > cache.maxLength ) {
                  cache.keyLog.length = cache.maxLength;
                }

                // check the combo log - go through each key
                for ( var i = 0; i < cache.keyLog.length; i++ ) {
                  // and for each key, build a list of permutations
                  // work backwards, since our keys are stored like that
                  for ( var j = cache.keyLog.length - 1 - i, combo = []; j >= 0; j-- ) {
                    combo.push( cache.keyLog[j] )
                  }
                  // make the string permutation
                  combo = combo.join(',');
                  // and give it a shot, yo
                  if ( cache.actions[ combo ] ) {
                    cache.actions[ combo ].call( el, e, cache, combo );
                  }
                }

              }
          },

          // default options
          defaultOptions =  {
            // time until keypresses get forgotten
            time: 2000,
            // collect events from inputs on non-inputs/directly bound
            // events
            bubbleInputs: false,
            // if user presses tab in input, don't lose focus
            holdTab: false
          },

          // Add key->action to _key_actions object via $.data
          // wrap the keyup handler to use the _key_cache object
          bindAction = function( key, action, options ) {
            var $this = $( this ),
                data = $this.data() || {},
                cache,
                keyLength = key.split(',').length;

            // make our default object to hold everything
            // that's associated with the dom node bound
            if ( !data._key_cache ) {
              data._key_cache = {
                actions: {},
                handler: undefined,
                keyLog: [],
                maxLength: 0,
                lastKeyTime: 0,
                state: {},
                options: $.extend( {}, defaultOptions )
              };
            }
            cache = data._key_cache;

            // mesh in the custom options with this node's optinos
            $.extend( cache.options, options );

            // bind up the action to the key
            cache.actions[ key ] = action;

            // make sure our maxLength buffer is updated
            if ( keyLength > cache.maxLength ) {
              cache.maxLength = keyLength;
            }

            // we only want one handler bound to this element
            // since it's the same actions obj, future el:key->action
            // binds will work
            if ( !cache.handler ) {
              // make the handler with a wrapper fn to preserve
              // the actions and log in scope
              cache.handler = function(e){
                handler.call( $this[0], e, cache );
              }

              // actually bind/make the handler
              $this.keydown( cache.handler );
              $this.keyup( cache.handler );
            }

            return this;
          },

          // preprocessor for using C 'n stuff
          addKey = function( keys, action, opts ) {
             var controlCopy = keys,
                metaCopy,
                $this = $( this ),
                data = $this.data();

            // handle capital C
            // if there's a capital C, we need to make one with `c` and one with `m`
            // as of now, not supporting permutations of them for useability sake
            if ( /C/.test( keys ) ) {
              controlCopy = keys.replace( '/C/g', 'c' );
              metaCopy = keys.replace( '/C/g', 'm' );
            }

            //bind up control to this
            bindAction.call( this, controlCopy, action, opts);

            // wanna bind some meta?
            if ( metaCopy ) {
              bindAction.call( this, metaCopy, action, opts );
            }
          },

          // Just a little thing to record the combo you want -
          // run $.fn.key( 'help' ) or $().key('help') to launch the
          // dialog/popup to track keyinputs
          help = function() {
            // add content to dom
            var $input = $('<input style="width:100%;border:1px solid #CCC;font-size:1.3em;">'),
                $output = $( '<div>' ),
                $clear = $( '<button>CLEAR</button>'),
                $halp = $( '<div style="position:absolute;top:0;left:0;width:100%;z-index:9001;background:#000;color:#FFF;font-size:1.3em;">' ).append( $input, $clear, $output );

            // bind input log
            $input.key('*', function( e, cache, key ) {
                var prev = $output.html();
                $output.html( prev + ( prev.length ? ',': '' ) + key );
              }, {
                keepTabInInput: true
              });

            // clear button
            $clear.bind( 'click', function() {
              $output.html('');
              $input.val('');
            });

            // oh harro dom
            $( document.body ).append( $halp );
          };

          // make the actual plugin
          $.fn.key = function( keys, action, opts ) {
            // asking for the combo maker tool thingy?
            if ( keys === "help" ) {
              help();
              return false;
            }

            if ( keys === "data" ) {
              return this.data( '_key_cache' );
            }

            var _this = this;

            // make keys an object if one wasn't passed
            if ( $.type( keys ) !== 'object' ) {
              var newKeys = {};
              newKeys[ keys ] = action;
              keys = newKeys;
            } else {
              opts = action;
            }
          // for each key-set, bind it up
            $.each( keys, function( i, v ) {
              addKey.call( _this, i, v, opts );
            });

          // chain this shit, yo
          return this;
        };
  })( jQuery, document );

  (function($){
    $.fn.oneLine = function( ) {
        return this.each( function() {
            var $this = $( this ),
                $test = $( '<'+$this[0].nodeName+'>' ).append('.').css( 'visibility', 'visible' ),
                limiter = 0;
            $this.after( $test );
            // while the text is still too big and in our try threshhold
            while( $this.height() > $test.height() && limiter++ < 10 ) {
                var size = parseInt( $this.css( 'fontSize' ) ) * ((85+limiter)/100);
                console.log( size, limiter, $this.height(), $test.height() );
                console.dir( $this );
                $this.css( 'font-size', size );
                $test.css( 'font-size', size );
            }
                console.log( size, limiter, $this.height(), $test.height() );
            
            //$test.remove();        
        });  
    }
  }(jQuery));

  /*
   * jQuery BBQ: Back Button & Query Library - v1.3pre - 8/26/2010
   * http://benalman.com/projects/jquery-bbq-plugin/
   * 
   * Copyright (c) 2010 "Cowboy" Ben Alman
   * Dual licensed under the MIT and GPL licenses.
   * http://benalman.com/about/license/
   */
  (function($,r){var h,n=Array.prototype.slice,t=decodeURIComponent,a=$.param,j,c,m,y,b=$.bbq=$.bbq||{},s,x,k,e=$.event.special,d="hashchange",B="querystring",F="fragment",z="elemUrlAttr",l="href",w="src",p=/^.*\?|#.*$/g,u,H,g,i,C,E={};function G(I){return typeof I==="string"}function D(J){var I=n.call(arguments,1);return function(){return J.apply(this,I.concat(n.call(arguments)))}}function o(I){return I.replace(H,"$2")}function q(I){return I.replace(/(?:^[^?#]*\?([^#]*).*$)?.*/,"$1")}function f(K,P,I,L,J){var R,O,N,Q,M;if(L!==h){N=I.match(K?H:/^([^#?]*)\??([^#]*)(#?.*)/);M=N[3]||"";if(J===2&&G(L)){O=L.replace(K?u:p,"")}else{Q=m(N[2]);L=G(L)?m[K?F:B](L):L;O=J===2?L:J===1?$.extend({},L,Q):$.extend({},Q,L);O=j(O);if(K){O=O.replace(g,t)}}R=N[1]+(K?C:O||!N[1]?"?":"")+O+M}else{R=P(I!==h?I:location.href)}return R}a[B]=D(f,0,q);a[F]=c=D(f,1,o);a.sorted=j=function(J,K){var I=[],L={};$.each(a(J,K).split("&"),function(P,M){var O=M.replace(/(?:%5B|=).*$/,""),N=L[O];if(!N){N=L[O]=[];I.push(O)}N.push(M)});return $.map(I.sort(),function(M){return L[M]}).join("&")};c.noEscape=function(J){J=J||"";var I=$.map(J.split(""),encodeURIComponent);g=new RegExp(I.join("|"),"g")};c.noEscape(",/");c.ajaxCrawlable=function(I){if(I!==h){if(I){u=/^.*(?:#!|#)/;H=/^([^#]*)(?:#!|#)?(.*)$/;C="#!"}else{u=/^.*#/;H=/^([^#]*)#?(.*)$/;C="#"}i=!!I}return i};c.ajaxCrawlable(0);$.deparam=m=function(L,I){var K={},J={"true":!0,"false":!1,"null":null};$.each(L.replace(/\+/g," ").split("&"),function(O,T){var N=T.split("="),S=t(N[0]),M,R=K,P=0,U=S.split("]["),Q=U.length-1;if(/\[/.test(U[0])&&/\]$/.test(U[Q])){U[Q]=U[Q].replace(/\]$/,"");U=U.shift().split("[").concat(U);Q=U.length-1}else{Q=0}if(N.length===2){M=t(N[1]);if(I){M=M&&!isNaN(M)?+M:M==="undefined"?h:J[M]!==h?J[M]:M}if(Q){for(;P<=Q;P++){S=U[P]===""?R.length:U[P];R=R[S]=P<Q?R[S]||(U[P+1]&&isNaN(U[P+1])?{}:[]):M}}else{if($.isArray(K[S])){K[S].push(M)}else{if(K[S]!==h){K[S]=[K[S],M]}else{K[S]=M}}}}else{if(S){K[S]=I?h:""}}});return K};function A(K,I,J){if(I===h||typeof I==="boolean"){J=I;I=a[K?F:B]()}else{I=G(I)?I.replace(K?u:p,""):I}return m(I,J)}m[B]=D(A,0);m[F]=y=D(A,1);$[z]||($[z]=function(I){return $.extend(E,I)})({a:l,base:l,iframe:w,img:w,input:w,form:"action",link:l,script:w});k=$[z];function v(L,J,K,I){if(!G(K)&&typeof K!=="object"){I=K;K=J;J=h}return this.each(function(){var O=$(this),M=J||k()[(this.nodeName||"").toLowerCase()]||"",N=M&&O.attr(M)||"";O.attr(M,a[L](N,K,I))})}$.fn[B]=D(v,B);$.fn[F]=D(v,F);b.pushState=s=function(L,I){if(G(L)&&/^#/.test(L)&&I===h){I=2}var K=L!==h,J=c(location.href,K?L:{},K?I:2);location.href=J};b.getState=x=function(I,J){return I===h||typeof I==="boolean"?y(I):y(J)[I]};b.removeState=function(I){var J={};if(I!==h){J=x();$.each($.isArray(I)?I:arguments,function(L,K){delete J[K]})}s(J,2)};e[d]=$.extend(e[d],{add:function(I){var K;function J(M){var L=M[F]=c();M.getState=function(N,O){return N===h||typeof N==="boolean"?m(L,N):m(L,O)[N]};K.apply(this,arguments)}if($.isFunction(I)){K=I;return J}else{K=I.handler;I.handler=J}}})})(jQuery,this);
  /*
   * jQuery hashchange event - v1.3 - 7/21/2010
   * http://benalman.com/projects/jquery-hashchange-plugin/
   * 
   * Copyright (c) 2010 "Cowboy" Ben Alman
   * Dual licensed under the MIT and GPL licenses.
   * http://benalman.com/about/license/
   */
  (function($,e,b){var c="hashchange",h=document,f,g=$.event.special,i=h.documentMode,d="on"+c in e&&(i===b||i>7);function a(j){j=j||location.href;return"#"+j.replace(/^[^#]*#?(.*)$/,"$1")}$.fn[c]=function(j){return j?this.bind(c,j):this.trigger(c)};$.fn[c].delay=50;g[c]=$.extend(g[c],{setup:function(){if(d){return false}$(f.start)},teardown:function(){if(d){return false}$(f.stop)}});f=(function(){var j={},p,m=a(),k=function(q){return q},l=k,o=k;j.start=function(){p||n()};j.stop=function(){p&&clearTimeout(p);p=b};function n(){var r=a(),q=o(m);if(r!==m){l(m=r,q);$(e).trigger(c)}else{if(q!==m){location.href=location.href.replace(/#.*/,"")+q}}p=setTimeout(n,$.fn[c].delay)}$.browser.msie&&!d&&(function(){var q,r;j.start=function(){if(!q){r=$.fn[c].src;r=r&&r+a();q=$('<iframe tabindex="-1" title="empty"/>').hide().one("load",function(){r||l(a());n()}).attr("src",r||"javascript:0").insertAfter("body")[0].contentWindow;h.onpropertychange=function(){try{if(event.propertyName==="title"){q.document.title=h.title}}catch(s){}}}};j.stop=k;o=function(){return a(q.location.href)};l=function(v,s){var u=q.document,t=$.fn[c].domain;if(v!==s){u.title=h.title;u.open();t&&u.write('<script>document.domain="'+t+'"<\/script>');u.close();q.location.hash=v}}})();return j})()})(jQuery,this);

});
