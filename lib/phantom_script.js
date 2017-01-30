// Unfortunately, since this is processed dynamically, it needs to be JavaScript and not CoffeeScript. https://github.com/ariya/phantomjs/issues/12410
var page = require('webpage').create();
// webpage package is documented at http://phantomjs.org/api/webpage/
var system = require('system');
var url = system.args[1];
var totalIterations = 0;
var renderPage = function(url){
  url = url.replace(/\/$/, "");
  var intervalId = false;
  var isReadyForSpiderable = false;
  var realStatus = null;
  var headers = [];
  var isReady = function (){
    return page.evaluate(function (){
      if(typeof Meteor === 'undefined' || Meteor.status === undefined || !Meteor.status().connected){
        return false;
      }
      if(typeof Package === 'undefined' || Package["jazeee:spiderable-longer-timeout"] === undefined || Package["jazeee:spiderable-longer-timeout"].Spiderable === undefined || !Package["jazeee:spiderable-longer-timeout"].Spiderable._initialSubscriptionsStarted){
        return false;
      }
      isReadyForSpiderable = Meteor.isRouteComplete || Meteor.isReadyForSpiderable;
      // We only need one of these flags set in order to proceed. I will deprecate Meteor.isRouteComplete after 2015-12-31
      if(!(isReadyForSpiderable)){
          return false;
      }
      if(typeof Tracker === 'undefined' || typeof DDP === 'undefined'){
          return false;
      }
      Tracker.flush();
      if(!DDP._allSubscriptionsReady()){
        return false;
      }else if(Spiderable.redirect){
        return {redirectTo: Spiderable.redirect};
      }else{
        return true;
      }
    });
  };

  var dumpPageContent = function(){
    var prefix = '<html><head></head><body><pre',
        output = page.content.substring(0, prefix.length) === prefix ? page.plainText : page.content;
    /*
    @url https://github.com/jazeee/jazeee-meteor-spiderable/issues/16
    @url http://googlewebmastercentral.blogspot.nl/2015/10/deprecating-our-ajax-crawling-scheme.html
    @description Line 50 should be removed in further releases, when we will figure out how to avoid
    content duplicating caused of page rendering twice. First on server, second on client, any
    suggestion are welcome in issue #16
    */
    output     = output.replace(/<script[^>]+>(.|\n|\r)*?<\/script\s*>/ig, '');
    output     = output.replace('<meta name="fragment" content="!">', '');
    var rem    = /<!--([\ ]{0,2})response:status-code=([0-9]{3})([\ ]{0,2})-->/.exec(output);

    if(rem && rem.length >= 3){
      if(!isNaN(rem[2])){
        realStatus = parseInt(rem[2]);
      }
    }

    console.log(JSON.stringify({
      status:  realStatus,
      headers: headers,
      content: output
    }));
  };

  page.onResourceReceived = function(response){
    if(response.url && response.url.length){
      response.url = response.url.replace(/\/$/, "");
    }

    if(response.redirectURL && response.redirectURL.length){
      response.redirectURL = response.redirectURL.replace(/\/$/, "");
    }

    if(response.url === url || response.redirectURL === url){
      realStatus  = response.status;
      headers     = response.headers;
    }
  };

  page.open(url, function(status){
    var renderIterations = 0;
    intervalId = setInterval(function(){
      var renderStatus = isReady();
      if(renderIterations < 50 && (!renderStatus || realStatus === null)){
        // Under heavy server load, we may not get an immediate response. We will wait for up to 5 seconds before allowing a response. See #13
        renderIterations++;
        return;
      }else if(renderStatus === true || realStatus){
        clearInterval(intervalId);
        dumpPageContent();
        phantom.exit();
      }else if(renderStatus.redirectTo){
        clearInterval(intervalId);
        renderPage(renderStatus.redirectTo);
      }
      if(totalIterations > 200){
        // We have waited too long. Don't leave this process running in the background...
        phantom.exit(-1);
      }
      totalIterations++;
    }, 100);
  });
};

renderPage(url);