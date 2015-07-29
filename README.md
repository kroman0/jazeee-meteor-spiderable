spiderable-longer-timeout
====
 - [About package](#about)
 - [Installation](#installation)
 - [Setup](#setup)
 - [Render page](#isreadyforspiderable-boolean)
 - [Options](#options)
 - [Set up bot's user agents](#useragentregexps-regexp)
 - [Cache lifetime (TTL)](#cachelifetimeinminutes-cache-ttl-number)
 - [Set ignored routes](#ignoredroutes-string)
 - [Differentiate Phantomjs spider rendering from normal web browsing](#customquery-booleanstring)
 - [Supported redirects](#supported-redirects)
 - [On/Off debug messages](#debug-boolean)
 - [Enable 404 page and correct responses](#enable-default-404-response-if-youre-using-iron-router)
 - [Important notes](#important)
 - [How to install Phantomjs to server](#install-phantomjs-on-your-server)
 - [Testing](#testing)
 - [Test with CURL](#curl)
 - [Test with Google](#google-tools-fetch-as-google)
 - [Original Spiderable documentation](#from-meteors-original-spiderable-documentation-see-notes-specific-to-this-branch-above)

### About
This is a branch of the standard meteor `spiderable` package, with some merged code from
`ongoworks:spiderable` package. Primarily, this lengthens the timeout to 30 seconds and
size limit to 10MB. All results will be cached to Mongo collection, by default for 3 hours (180 minutes).

This package will ignore all SSL error in favor of page fetching.

This package supports "real response-code" and "real headers", this means if your route returns `301` response code with some headers
the package will return the same headers. This package also has support for [JavaScript redirects](#supported-redirects).

This package has build-in caching mechanism, by default it stores results for 3 hours, to change storing period set `Spiderable.cacheLifetimeInMinutes` to other value in minutes.

### Installation
```shell
meteor add jazeee:spiderable-longer-timeout
```

#### Setup:
##### isReadyForSpiderable {*Boolean*}
On server and client this tells Spiderable that everything is ready. Spiderable will wait for `Meteor.isReadyForSpiderable` to be `true`, which allows for
finer control about when content is ready to be published.
```coffeescript
Router.onAfterAction ->
  if @ready()
    Meteor.isReadyForSpiderable = true
```

#### Options
##### userAgentRegExps {[*RegExp*]}
Array of Regular Expressions, of bot's user agents that we want to serve statically, but do not obey the `_escaped_fragment_ protocol`.
Optionally set or extend `Spiderable.userAgentRegExps` list.
```coffeescript
Spiderable.userAgentRegExps.push /^vkShare/i
```
__Default Bots__:
 - `/^facebookExternalHit/i`
 - `/^linkedinBot/i`
 - `/^twitterBot/i`
 - `/^googleBot/i`
 - `/^bingBot/i`
 - `/^yandex/i`
 - `/^google-structured-data-testing-tool/i`
 - `/^yahoo/i`
 - `/^MJ12Bot/i`
 - `/^tweetmemeBot/i`
 - `/^baiduSpider/i`
 - `/^Mail\.RU_Bot/i`
 - `/^ahrefsBot/i`
 - `/^SiteLockSpider/`

##### cacheLifetimeInMinutes (Cache TTL) {*Number*}
How long cached Spiderable results should be stored (in minutes).
__Note:__ 
 - Should be set before `Meteor.startup`
 - Value should be {*Number*} in minutes
 - To set a new cache lifetime you need to drop index on `createdAt_1`.
 - __Default value__: 180 (3 hours)

```coffeescript
Spiderable.cacheLifetimeInMinutes = 60 # 1 hour in minutes
```
If you want to change your cache lifetime, first - drop the cache index. To drop the cache index, run in Mongo console:
```javascript
db.SpiderableCacheCollection.dropIndex('createdAt_1');
/* or */
db.SpiderableCacheCollection.dropIndexes();
```

##### ignoredRoutes {[*String*]}
`Spiderable.ignoredRoutes` - is array of strings, routes that we want to serve statically, but do not obey the `_escaped_fragment_` protocol.
For more info see this [thread](https://github.com/meteor/meteor/issues/3853).
```coffeescript
Spiderable.ignoredRoutes.push '/cdn/storage/Files/'
```

##### customQuery {*Boolean*|*String*}
`Spiderable.customQuery` - additional `get` query will be appended to http request.
This option may help to build different client's logic for requests from phantomjs and normal users
 - If `true` - Spiderable will append `___isRunningPhantomJS___=true` to the query
 - If `String` - Spiderable will append `String=true` to the query

```coffeescript
Spiderable.customQuery = true
# or
Spiderable.customQuery = '_fromPhantom_'

# Usage:
Router.onAfterAction ->
  if Meteor.isClient and _.has @params.query, '___isRunningPhantomJS___'
    Session.set '___isRunningPhantomJS___', true
```

##### debug {*Boolean*}
Show/hide server's console messages, set `Spiderable.debug` to `true` to show server's console messages
 - Default value: `false`

```coffeescript
Spiderable.debug = true
```

##### Enable default `404` response if you're using Iron-Router
 - Create template which you prefer to return, when page is not found
 - Set `Spiderable.customQuery`
 - Set iron router's `notFoundTemplate`
 - Enable iron router's `dataNotFound` plugin. See below or read more about [iron-router plugins](http://iron-meteor.github.io/iron-router/#plugins)

```coffeescript
if Meteor.isServer
  Spiderable.customQuery = true

Router.configure
  notFoundTemplate: '_404'

Router.plugin 'dataNotFound', 
  notFoundTemplate: Router.options.notFoundTemplate
```

```jade
template(name="_404")
  h1 404
  h3 Oops, page not found
  p Sorry, page you're requested is not exists or was deleted
```

##### Supported redirects
```coffeescript
window.location.href = 'http://example.com/another/page'
window.location.replace 'http://example.com/another/page'

Router.go '/another/page'
Router.current().redirect '/another/page'
Router.route '/one', ->
  @redirect '/another/page'
```

#### **Important**
Set `Meteor.isReadyForSpiderable` to `true` when your route is finished, in order to publish.
Deprecated `Meteor.isRouteComplete=true`, but it will work until at least 2015-12-31 after which I'll remove it...
See [code for details](https://github.com/jazeee/jazeee-meteor-spiderable/blob/master/phantom_script.js)

#### Install PhantomJS on your server
If you deploy your application with `meteor bundle`, you must install
phantomjs ([http://phantomjs.org](http://phantomjs.org/)) somewhere in your
`$PATH`. If you use Meteor Up, then `meteor deploy` can do this for you.

`Spiderable.originalRequest` is also set to the http request. See [issue 1](https://github.com/jazeee/jazeee-meteor-spiderable/issues/1).

#### Testing
Test your site by appending a query to your URLs: `URL?_escaped_fragment_=` as in `http://your.site.com/path_escaped_fragment_=`

##### curl
`curl` your `localhost` or host name, if you on production, like:
```shell
curl http://localhost:3000/?_escaped_fragment_=
curl http://localhost:3000/ -A googlebot
```

##### Google Tools: Fetch as Google
Use `Fetch as Google` tools to scan your site. Tips:
* Observe your server logs using tail -f or mup logs -f
* `Fetch as Google` and observe that it takes 3-5 minutes before displaying results.
   * Use an uncommon URL to help you identify your request in the logs. Consider adding an extra URL query parameter. For example:
```shell
# Simple test with test=1 query
curl "http://localhost:3002/blogs?_escaped_fragment_=&test=1"
# Set the date in the query, which will show up in Meteor logs, with a unique date. (Turn on `Spiderable.debug=true`)
TEST=`date "+%Y%m%d-%H%M%S"`; echo $TEST; curl "http://localhost:3000/blogs?_escaped_fragment_=&test=${TEST}"
```
Interpreting `Fetch as Google` results:
 * The tool will not actually hit your server right away.
 * It appears to provide a simple scan result without the extra `?_escaped_fragment_=` component.
 * Wait several minutes more. Google appears to request the page, which will show up in your logs as `Spiderable successfully completed`.
 * Search on Google using `site:your.site.com`
 * Make sure Google lists all relevant pages.
 * Look at Google's cached version of the pages, to make sure it is fully rendered.
 * Make sure that Google sees the pages with all data subscriptions complete.

### From Meteor's original Spiderable documentation. See notes specific to this branch (above).
`spiderable` is part of [Webapp](https://www.meteor.com/webapp). It's
one possible way to allow web search engines to index a Meteor
application. It uses the [AJAX Crawling
specification](https://developers.google.com/webmasters/ajax-crawling/)
published by Google to serve HTML to compatible spiders (Google, Bing,
Yandex, and more).

When a spider requests an HTML snapshot of a page the Meteor server runs the
client half of the application inside [phantomjs](http://phantomjs.org/), a
headless browser, and returns the full HTML generated by the client code.

In order to have links between multiple pages on a site visible to spiders, apps
must use real links (eg `<a href="/about">`) rather than simply re-rendering
portions of the page when an element is clicked. Apps should render their
content based on the URL of the page and can use [HTML5
pushState](https://developer.mozilla.org/en-US/docs/DOM/Manipulating_the_browser_history)
to alter the URL on the client without triggering a page reload. See the [Todos
example](http://meteor.com/examples/todos) for a demonstration.

When running your page, `spiderable` will wait for all publications
to be ready. Make sure that all of your [`publish functions`](#meteor_publish)
either return a cursor (or an array of cursors), or eventually call
[`this.ready()`](#publish_ready). Otherwise, the `phantomjs` executions
will fail.

