define([
  'jquery', 
  'socket.io', 
  'codemirror/lib/codemirror',
  'codemirror/mode/xml/xml',
  'codemirror/mode/javascript/javascript',
  'codemirror/mode/htmlmixed/htmlmixed',
  'plugin'
], function($, io, CodeMirror) {

/*
 * Copyright 2011 Dan Heberden
 * Dual licensed under MIT and GPL
 *
 * Don't judge me, this is a very rushed alpha of this project and it's messy, i know
 */


Math.circularMod = function( value, mod ) {
    value %= mod;
    return value < 0 ? mod + value : value;
};

var socket = io.connect(location.origin + ':8001');
function postSlide(current, next) {
  var content = "";
  if (!current || !current.jquery) {
    content += "NOT FOUND";
  } else {
    current.find('script[type="notes"]').each(function() {
      content += '<div class="notes">' + $(this).html().replace(/\\n/g, '<br><br>') + '</div>';
    });
  }

  if (next && next.jquery) {

    var cloned = next.clone();

    cloned.find('script[type^=text]').each(function() {
      var script = $(this);
      var content = script.html()
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      var pre = $('<pre>').html(content);
      pre.insertBefore(script);
    });

    content += cloned.html();
  }

  socket.emit('post', content);  
}


$.fn.yasd = function( method ){
  if ( !this.length ) {
    return this;
  }
  this.each( function() {
    var el = this.contentWindow || ( this.ownerDocument && this.ownerDocument.curentView ) || this;
    if ( el.yasd ) {
      el.yasd( method );
    }
  });
};

var Console = function(el){ 
  this.el = el; 
};
Console.prototype = {
  log: function() {
    var args = [].slice.call( arguments ),
				i = 0;
			for(; i < args.length; i++) {
				if ( /(object|array)/.test( $.type( args[i] ) ) ) {
					args[i] = window.JSON.stringify( args[i] );
					args[i] = args[i].replace( ",", ", " );
				} else {
          args[i] = ''+args[i];
        }
			}
			var	$line = $( "<div>"+args.join(', ')+"</div>").hide()
        .appendTo( this.el );
			$line.slideDown();
  },
  clear: function() {
    var el = this.el;
    el.children( 'div' ).slideUp(200).promise().done( function() {
      el.empty();
    });
  },
  dir: function(a){
    console.dir( a );
  }
};

var FrameManager = function(){ 
  return this.init( ); 
};
FrameManager.prototype = {
  init: function( ) {

    // make the three frames we'll shuffle around
    var iframes = { currentFrame: 0 };
    for ( var i = 0, iframe; i < 2; i++ ) {
      iframe = $( '<iframe id="slide'+i+'" src="sandbox.htm">' ).appendTo( 'body' );
      iframes[i] = iframe ;
      if ( i ) {
        iframe.addClass( 'previous' );
      }
    }
    iframes.currentFrame = 0;

    this.iframes = iframes;

    // make pubsub object
    this._pubsub = {};

    // listen for animation events
    $( document ).bind( 'webkitTransitionEnd transitionend oTransitionEnd' , $.proxy( this.animationComplete, this ) );
  },

  // ran when the css3 transitions are done
  animationComplete: function( e ) {
    var $iframe = $( e.target );
    if ( $iframe.is( '.current' ) ) {
      // resolve the iframe's slide
      var dfd = $iframe.data( 'slide' ).dfd;
      dfd.resolve();

      // destroy the dfd for any further accidental resolution
      dfd = null;
    }
  },

  // how many slides are being transitioned/loaded/whatever
  transitioning: 0,

  clear: function( frame ) {
    // save if for later
    var dfd = $.Deferred(),
        slides = this.slides,
        _this = this,
        oldDfd = frame.data( 'dfd' );

    // reset src
    frame[0].src = frame[0].src;

    // we just reset src, so no pending load events will ever fire
    if ( oldDfd && oldDfd.dfd && oldDfd.state() === 'resolved' ) {
      oldDfd.dfd.reject();
    }

    // save our new deferred
    frame.data( 'dfd', dfd );

    // event time
    frame.unbind( 'load' ).bind( 'load', function( e ) {
      $.extend( true,  frame[0].contentWindow.document.defaultView, _this.iframeOverride );
      $( frame[0].contentWindow.document ).key( slides.keys );
      // give it 100ms to load/test this shit
      dfd.resolve( e.target );
    });

    // this'll get done someday [i hope]
    return dfd.promise();
  },

  // handle loading and showing a new slide
  load: function( slide ) {
    var iframes = this.iframes;
    var dfd = $.Deferred();
    var _this = this;
    var lastSlide = _this.lastSlide || { id: 0 };
    var animateDirection = lastSlide.id >= slide.id ? 'next' : 'previous';
    var animateOpposite = animateDirection === 'next' ? 'previous' : 'next';
    var sameSlide = lastSlide.id === slide.id;
    var next = iframes[ +!iframes.currentFrame ];
    var current = iframes [ +iframes.currentFrame ];
    var slides = this.slides;

    // we've requested a new slide
    this.transitioning++;

    // flip for next time
    iframes.currentFrame = !iframes.currentFrame;

    // when our new frame is all ready to go
    $.when( this.clear( next, slide.id ) )
      .done( function() {

        // run any slide teardown code
        current.yasd( 'teardown' );

        // clear the console
        _this.iframeOverride.console.clear();

        // keep an eye on the last slide requested
        _this.lastSlide = slide;

        // append the slide content into the next frame
        $( next[0].contentWindow.document.body ).append( '<section class="'+slide.slide.prop('className')+'">' + slide.slide.html() + '</section>' );
 
        // publish the next slide's content to remote listeners
        var upcoming = slides.slides[_this.slides.currentSlide + 1];
        postSlide(slide.slide, upcoming ? upcoming.slide : undefined);


        // run the init hook on the iframe
        next.yasd( 'init' );

        // run the run scripts when it's loaded
        dfd.done( function(){
          // this slide is D - U - N done!
          _this.transitioning--;
          // this is being buggy :/
          // _this.clear( current );
          next.yasd( 'run' );
        });

         // save the dfd onto the slide to trigger if it finishes animating
        slide.dfd = dfd;

        // save the slide data on the current slide
        next.data( 'slide', slide );

        // put the next slide where id needs to be
        next.prop('className', [animateOpposite, slide.slide.prop('className')].join(' '));
        current.removeClass( 'animate' );
        // apply the move real quick
        document.body.offsetWidth = document.body.offsetWidth;

        // don't animate?
        if ( sameSlide || _this.transitioning > 1 ) {
          dfd.resolve( slide );
        } else {
          // dfd will get resolved on the animation complete event
          next.addClass( 'animate' );
          current.addClass( 'animate' );
          // failsafe if the animation event doesn't fire
          setTimeout( function() {
            dfd.resolve( slide );
          },800);
        }

        // either way, move these around
        current.addClass( animateDirection ).removeClass( 'current' );
        next.addClass( 'current' ).removeClass( animateOpposite + ' ' + animateDirection );

      })
      .fail( function() {
        _this.transitioning--;
      });

    // it'll all be loaded/done - SOMEDAY
    return dfd.promise();
  },

  addSlides: function( slides ) {
    this.slides = slides;
  },

  iframeOverride: {
    CodeMirror: CodeMirror
  },

  console: function() { 
    
  }
};
var frames = new FrameManager();

var SlideManager = function( sel ){ return this.init( sel ); };
SlideManager.prototype = {
  currentSlide: undefined,
  init: function( sel ) {
    // get the dom nodes
    var slideElements = $( sel );

    // liiiiiinked list
    var slides = this.slides = [];
    // parse our linked list
    slideElements.each( function( i ){
      var $slide = $( this );
      slides.push({
        slide: $slide,
        id: i,
        title: $( '<i>' ).html( $( this ).attr( 'title' ) || "Slide " + i ).text(),
        prev: Math.circularMod( i - 1, slideElements.length ),
        next: Math.circularMod( i + 1, slideElements.length )
      });
    });

    // make moar stuff
    this._pubsub = $( {} );

    return this;
  },

  subscribe: function() {
    this._pubsub.on.apply( this._pubsub, arguments );
  },

  unsubscribe: function() {
    this._pubsub.off.apply( this._pubsub, arguments );
  },

  publish: function() {
    this._pubsub.trigger.apply( this._pubsub, arguments );
  },

  remote: function( action ) {
    // actual slide 
    if ( $.isNumeric( action ) ) {
      // cap the slideNum to 0 and the maximum slide number
      $.bbq.pushState( '#'+Math.max( 0, Math.min( this.slides.length-1, action ) )  );
      return this;
    }

    // actions (just call with correct slide #)
    var targetSlide = action === 'next' ? '+=1' :
                      action === 'prev' ? '-=1' :
                      action === 'end' ? this.slides.length -1 :
                      0;

    // support +=X or -=X slide adjustement
    if ( !targetSlide ) {
      var plusOrMinus = /^(\+|\-)=(\d+)$/.exec ( action );
      if ( plusOrMinus && plusOrMinus[2] ) {
        targetSlide = Number( plusOrMinus[1] + plusOrMinus[2] ) + Number(this.currentSlide);
      }
    }
    return this.remote( targetSlide );
  },

  goto: function( slideId ){
    // build new slide, ya?
    var slide = this.slides[ slideId ],
        _this = this;
    if ( !slide ) {
      console.warn( 'Slide ' + slideId + ' is not in the slide deck - DANGER DANGER!' );
      return;
    }

    this.currentSlide = slideId;
    _this.publish( 'slide:changing', slide );

    // make the next slide - return a promise, yo
    return $.when( frames.load( slide ) )
            .done( function() {
              _this.publish( 'slide:change', slide );
            });
  },

  keys: {
    '37':function(){
      slides.remote('-=1');
    },
    '39': function(){
      slides.remote('+=1');
    }
  }

};
var slides;

$( document ).ready( function() {
  slides = new SlideManager( 'body > section' );
  frames.addSlides( slides );
  var console = new Console( $( '#console' ) );
  frames.iframeOverride._console = window.console;
  frames.iframeOverride.console = console;
  var $slideCount = $( '#yasd-slide-marker' );
  slides.subscribe( 'slide:changing', function( e, slide ) {
    $slideCount.html( slide.id );
  });
  $( document ).key( slides.keys );
  var $window = $( window ).bind( 'hashchange', function() {
    var fragment = $.param.fragment();
    // no slide specified
    if ( fragment === '' ) {
      slides.goto( 0 );
    } else {
      slides.goto( +fragment );
    }
  });
  $window.trigger( 'hashchange' );
  socket.on('slidePrevious', function() {
    slides.remote('-=1');
  });
  socket.on('slideNext', function() {
    slides.remote('+=1');
  });
});

});
