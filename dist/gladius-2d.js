/*
Copyright (c) 2011-2012, Mozilla Foundation
Copyright (c) 2011-2012, Alan Kligman
Copyright (c) 2011-2012, Robert Richter
Copyright (c) 2012, Michael Kelly
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
    Neither the name of the Mozilla Foundation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

(function( root, factory ) {

  if ( typeof exports === "object" ) {
    // Node
    module.exports = factory();
  } else if (typeof define === "function" && define.amd) {
    // AMD. Register as an anonymous module.
    define( 'gladius-2d', factory );
  } else if( root.Gladius ) {
    // Browser globals
    root.Gladius["gladius-2d"] = factory();
  } else {
    throw new Error( "failed to load gladius-2d; depends on Gladius" );
  }

}( this, function() {

/**
 * almond 0.0.3 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
/*jslint strict: false, plusplus: false */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {

    var defined = {},
        waiting = {},
        aps = [].slice,
        main, req;

    if (typeof define === "function") {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseName = baseName.split("/");
                baseName = baseName.slice(0, baseName.length - 1);

                name = baseName.concat(name.split("/"));

                //start trimDots
                var i, part;
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }
        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            main.apply(undef, args);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, i, ret, map;

        //Use name if no relName
        if (!relName) {
            relName = name;
        }

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Default to require, exports, module if no deps if
            //the factory arg has any arguments specified.
            if (!deps.length && callback.length) {
                deps = ['require', 'exports', 'module'];
            }

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name]
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw name + ' missing ' + depName;
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef) {
                    defined[name] = cjsModule.exports;
                } else if (!usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {

            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            //Drop the config stuff on the ground.
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = arguments[2];
            } else {
                deps = [];
            }
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function () {
        return req;
    };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (define.unordered) {
            waiting[name] = [name, deps, callback];
        } else {
            main(name, deps, callback);
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../tools/almond", function(){});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('base/extension',['require'],function ( require ) {

  var Extension = function( name, options ) {
    if( typeof name !== "string" || name.length === 0 ) {
      throw new Error( "extension needs a non-trivial name" );
    }
    this.name = name;

    options = options || {};
    var serviceNames, serviceName, service;
    var componentNames, componentName, component;
    var resourceNames, resourceName, resource;
    var i, l;
    var j, m;

    this.services = {};
    if( options.hasOwnProperty( "services" ) ) {
      serviceNames = Object.keys( options.services );
      for( i = 0, l = serviceNames.length; i < l; ++ i ) {
        serviceName = serviceNames[i];
        service = options.services[serviceName];
        if( typeof service === "function" ) {
          this.services[serviceName] = service;
        } else if( typeof service === "object" ) {
          this.services[serviceName] = {};
          this.services[serviceName].service = service.service;

          if( service.hasOwnProperty( "components" ) ) {
            this.services[serviceName].components = {};
            componentNames = Object.keys( service.components );
            for( j = 0, m = componentNames.length; j < m; ++ j ) {
              componentName = componentNames[j];
              this.services[serviceName].components[componentName] = service.components[componentName];
            }
          }

          if( service.hasOwnProperty( "resources" ) ) {
            this.services[serviceName].resources = {};
            resourceNames = Object.keys( service.resources );
            for( j = 0, m = resourceNames.length; j < m; ++ j ) {
              resourceName = resourceNames[j];
              this.services[serviceName].resources[resourceName] = service.resources[resourceName];
            }
          }
        } else {
          throw new Error( "malformed extension" );
        }
      }
    }

    this.components = {};
    if( options.hasOwnProperty( "components" ) ) {
      this.components = options.components;
    }

    this.resources = {};
    if( options.hasOwnProperty( "resources" ) ) {
      this.resources = options.resources;
    }
  };

  return Extension;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/guid',['require'],function ( require ) {
  

  function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    }).toUpperCase();
  }

  return guid;

});

/** @license MIT License (c) copyright B Cavalier & J Hann */

/**
 * when
 * A lightweight CommonJS Promises/A and when() implementation
 *
 * when is part of the cujo.js family of libraries (http://cujojs.com/)
 *
 * Licensed under the MIT License at:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @version 1.0.4
 */

(function(define) {
define('when',[],function() {
    var freeze, reduceArray, undef;

    /**
     * No-Op function used in method replacement
     * @private
     */
    function noop() {}

    /**
     * Allocate a new Array of size n
     * @private
     * @param n {number} size of new Array
     * @returns {Array}
     */
    function allocateArray(n) {
        return new Array(n);
    }

    /**
     * Use freeze if it exists
     * @function
     * @private
     */
    freeze = Object.freeze || function(o) { return o; };

    // ES5 reduce implementation if native not available
    // See: http://es5.github.com/#x15.4.4.21 as there are many
    // specifics and edge cases.
    reduceArray = [].reduce ||
        function(reduceFunc /*, initialValue */) {
            // ES5 dictates that reduce.length === 1

            // This implementation deviates from ES5 spec in the following ways:
            // 1. It does not check if reduceFunc is a Callable

            var arr, args, reduced, len, i;

            i = 0;
            arr = Object(this);
            len = arr.length >>> 0;
            args = arguments;

            // If no initialValue, use first item of array (we know length !== 0 here)
            // and adjust i to start at second item
            if(args.length <= 1) {
                // Skip to the first real element in the array
                for(;;) {
                    if(i in arr) {
                        reduced = arr[i++];
                        break;
                    }

                    // If we reached the end of the array without finding any real
                    // elements, it's a TypeError
                    if(++i >= len) {
                        throw new TypeError();
                    }
                }
            } else {
                // If initialValue provided, use it
                reduced = args[1];
            }

            // Do the actual reduce
            for(;i < len; ++i) {
                // Skip holes
                if(i in arr)
                    reduced = reduceFunc(reduced, arr[i], i, arr);
            }

            return reduced;
        };

    /**
     * Trusted Promise constructor.  A Promise created from this constructor is
     * a trusted when.js promise.  Any other duck-typed promise is considered
     * untrusted.
     */
    function Promise() {}

    /**
     * Create an already-resolved promise for the supplied value
     * @private
     *
     * @param value anything
     * @return {Promise}
     */
    function resolved(value) {

        var p = new Promise();

        p.then = function(callback) {
            checkCallbacks(arguments);

            var nextValue;
            try {
                if(callback) nextValue = callback(value);
                return promise(nextValue === undef ? value : nextValue);
            } catch(e) {
                return rejected(e);
            }
        };

        return freeze(p);
    }

    /**
     * Create an already-rejected {@link Promise} with the supplied
     * rejection reason.
     * @private
     *
     * @param reason rejection reason
     * @return {Promise}
     */
    function rejected(reason) {

        var p = new Promise();

        p.then = function(callback, errback) {
            checkCallbacks(arguments);

            var nextValue;
            try {
                if(errback) {
                    nextValue = errback(reason);
                    return promise(nextValue === undef ? reason : nextValue)
                }

                return rejected(reason);

            } catch(e) {
                return rejected(e);
            }
        };

        return freeze(p);
    }

    /**
     * Helper that checks arrayOfCallbacks to ensure that each element is either
     * a function, or null or undefined.
     *
     * @param arrayOfCallbacks {Array} array to check
     * @throws {Error} if any element of arrayOfCallbacks is something other than
     * a Functions, null, or undefined.
     */
    function checkCallbacks(arrayOfCallbacks) {
        var arg, i = arrayOfCallbacks.length;
        while(i) {
            arg = arrayOfCallbacks[--i];
            if (arg != null && typeof arg != 'function') throw new Error('callback is not a function');
        }
    }

    /**
     * Creates a new, CommonJS compliant, Deferred with fully isolated
     * resolver and promise parts, either or both of which may be given out
     * safely to consumers.
     * The Deferred itself has the full API: resolve, reject, progress, and
     * then. The resolver has resolve, reject, and progress.  The promise
     * only has then.
     *
     * @memberOf when
     * @function
     *
     * @returns {Deferred}
     */
    function defer() {
        var deferred, promise, listeners, progressHandlers, _then, _progress, complete;

        listeners = [];
        progressHandlers = [];

        /**
         * Pre-resolution then() that adds the supplied callback, errback, and progback
         * functions to the registered listeners
         *
         * @private
         *
         * @param [callback] {Function} resolution handler
         * @param [errback] {Function} rejection handler
         * @param [progback] {Function} progress handler
         *
         * @throws {Error} if any argument is not null, undefined, or a Function
         */
        _then = function unresolvedThen(callback, errback, progback) {
            // Check parameters and fail immediately if any supplied parameter
            // is not null/undefined and is also not a function.
            // That is, any non-null/undefined parameter must be a function.
            checkCallbacks(arguments);

            var deferred = defer();

            listeners.push(function(promise) {
                promise.then(callback, errback)
                    .then(deferred.resolve, deferred.reject, deferred.progress);
            });

            progback && progressHandlers.push(progback);

            return deferred.promise;
        };

        /**
         * Registers a handler for this {@link Deferred}'s {@link Promise}.  Even though all arguments
         * are optional, each argument that *is* supplied must be null, undefined, or a Function.
         * Any other value will cause an Error to be thrown.
         *
         * @memberOf Promise
         *
         * @param [callback] {Function} resolution handler
         * @param [errback] {Function} rejection handler
         * @param [progback] {Function} progress handler
         *
         * @throws {Error} if any argument is not null, undefined, or a Function
         */
        function then(callback, errback, progback) {
            return _then(callback, errback, progback);
        }

        /**
         * Resolves this {@link Deferred}'s {@link Promise} with val as the
         * resolution value.
         *
         * @memberOf Resolver
         *
         * @param val anything
         */
        function resolve(val) {
            complete(resolved(val));
        }

        /**
         * Rejects this {@link Deferred}'s {@link Promise} with err as the
         * reason.
         *
         * @memberOf Resolver
         *
         * @param err anything
         */
        function reject(err) {
            complete(rejected(err));
        }

        /**
         * @private
         * @param update
         */
        _progress = function(update) {
            var progress, i = 0;
            while (progress = progressHandlers[i++]) progress(update);
        };

        /**
         * Emits a progress update to all progress observers registered with
         * this {@link Deferred}'s {@link Promise}
         *
         * @memberOf Resolver
         *
         * @param update anything
         */
        function progress(update) {
            _progress(update);
        }

        /**
         * Transition from pre-resolution state to post-resolution state, notifying
         * all listeners of the resolution or rejection
         *
         * @private
         *
         * @param completed {Promise} the completed value of this deferred
         */
        complete = function(completed) {
            var listener, i = 0;

            // Replace _then with one that directly notifies with the result.
            _then = completed.then;

            // Replace complete so that this Deferred can only be completed
            // once. Also Replace _progress, so that subsequent attempts to issue
            // progress throw.
            complete = _progress = function alreadyCompleted() {
                // TODO: Consider silently returning here so that parties who
                // have a reference to the resolver cannot tell that the promise
                // has been resolved using try/catch
                throw new Error("already completed");
            };

            // Free progressHandlers array since we'll never issue progress events
            // for this promise again now that it's completed
            progressHandlers = undef;

            // Notify listeners
            // Traverse all listeners registered directly with this Deferred

            while (listener = listeners[i++]) {
                listener(completed);
            }

            listeners = [];
        };

        /**
         * The full Deferred object, with both {@link Promise} and {@link Resolver}
         * parts
         * @class Deferred
         * @name Deferred
         * @augments Resolver
         * @augments Promise
         */
        deferred = {};

        // Promise and Resolver parts
        // Freeze Promise and Resolver APIs

        /**
         * The Promise API
         * @namespace Promise
         * @name Promise
         */
        promise = new Promise();
        promise.then = deferred.then = then;

        /**
         * The {@link Promise} for this {@link Deferred}
         * @memberOf Deferred
         * @name promise
         * @type {Promise}
         */
        deferred.promise = freeze(promise);

        /**
         * The {@link Resolver} for this {@link Deferred}
         * @namespace Resolver
         * @name Resolver
         * @memberOf Deferred
         * @name resolver
         * @type {Resolver}
         */
        deferred.resolver = freeze({
            resolve:  (deferred.resolve  = resolve),
            reject:   (deferred.reject   = reject),
            progress: (deferred.progress = progress)
        });

        return deferred;
    }

    /**
     * Determines if promiseOrValue is a promise or not.  Uses the feature
     * test from http://wiki.commonjs.org/wiki/Promises/A to determine if
     * promiseOrValue is a promise.
     *
     * @param promiseOrValue anything
     *
     * @returns {Boolean} true if promiseOrValue is a {@link Promise}
     */
    function isPromise(promiseOrValue) {
        return promiseOrValue && typeof promiseOrValue.then === 'function';
    }

    /**
     * Register an observer for a promise or immediate value.
     *
     * @function
     * @name when
     * @namespace
     *
     * @param promiseOrValue anything
     * @param {Function} [callback] callback to be called when promiseOrValue is
     *   successfully resolved.  If promiseOrValue is an immediate value, callback
     *   will be invoked immediately.
     * @param {Function} [errback] callback to be called when promiseOrValue is
     *   rejected.
     * @param {Function} [progressHandler] callback to be called when progress updates
     *   are issued for promiseOrValue.
     *
     * @returns {Promise} a new {@link Promise} that will complete with the return
     *   value of callback or errback or the completion value of promiseOrValue if
     *   callback and/or errback is not supplied.
     */
    function when(promiseOrValue, callback, errback, progressHandler) {
        // Get a promise for the input promiseOrValue
        // See promise()
        var trustedPromise = promise(promiseOrValue);

        // Register promise handlers
        return trustedPromise.then(callback, errback, progressHandler);
    }

    /**
     * Returns promiseOrValue if promiseOrValue is a {@link Promise}, a new Promise if
     * promiseOrValue is a foreign promise, or a new, already-resolved {@link Promise}
     * whose resolution value is promiseOrValue if promiseOrValue is an immediate value.
     *
     * Note that this function is not safe to export since it will return its
     * input when promiseOrValue is a {@link Promise}
     *
     * @private
     *
     * @param promiseOrValue anything
     *
     * @returns Guaranteed to return a trusted Promise.  If promiseOrValue is a when.js {@link Promise}
     *   returns promiseOrValue, otherwise, returns a new, already-resolved, when.js {@link Promise}
     *   whose resolution value is:
     *   * the resolution value of promiseOrValue if it's a foreign promise, or
     *   * promiseOrValue if it's a value
     */
    function promise(promiseOrValue) {
        var promise, deferred;

        if(promiseOrValue instanceof Promise) {
            // It's a when.js promise, so we trust it
            promise = promiseOrValue;

        } else {
            // It's not a when.js promise.  Check to see if it's a foreign promise
            // or a value.

            deferred = defer();
            if(isPromise(promiseOrValue)) {
                // It's a compliant promise, but we don't know where it came from,
                // so we don't trust its implementation entirely.  Introduce a trusted
                // middleman when.js promise

                // IMPORTANT: This is the only place when.js should ever call .then() on
                // an untrusted promise.
                promiseOrValue.then(deferred.resolve, deferred.reject, deferred.progress);
                promise = deferred.promise;

            } else {
                // It's a value, not a promise.  Create an already-resolved promise
                // for it.
                deferred.resolve(promiseOrValue);
                promise = deferred.promise;
            }
        }

        return promise;
    }

    /**
     * Return a promise that will resolve when howMany of the supplied promisesOrValues
     * have resolved. The resolution value of the returned promise will be an array of
     * length howMany containing the resolutions values of the triggering promisesOrValues.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param howMany
     * @param [callback]
     * @param [errback]
     * @param [progressHandler]
     *
     * @returns {Promise}
     */
    function some(promisesOrValues, howMany, callback, errback, progressHandler) {
        var toResolve, results, ret, deferred, resolver, rejecter, handleProgress, len, i;

        len = promisesOrValues.length >>> 0;

        toResolve = Math.max(0, Math.min(howMany, len));
        results = [];
        deferred = defer();
        ret = when(deferred, callback, errback, progressHandler);

        // Wrapper so that resolver can be replaced
        function resolve(val) {
            resolver(val);
        }

        // Wrapper so that rejecter can be replaced
        function reject(err) {
            rejecter(err);
        }

        // Wrapper so that progress can be replaced
        function progress(update) {
            handleProgress(update);
        }

        function complete() {
            resolver = rejecter = handleProgress = noop;
        }

        // No items in the input, resolve immediately
        if (!toResolve) {
            deferred.resolve(results);

        } else {
            // Resolver for promises.  Captures the value and resolves
            // the returned promise when toResolve reaches zero.
            // Overwrites resolver var with a noop once promise has
            // be resolved to cover case where n < promises.length
            resolver = function(val) {
                // This orders the values based on promise resolution order
                // Another strategy would be to use the original position of
                // the corresponding promise.
                results.push(val);

                if (!--toResolve) {
                    complete();
                    deferred.resolve(results);
                }
            };

            // Rejecter for promises.  Rejects returned promise
            // immediately, and overwrites rejecter var with a noop
            // once promise to cover case where n < promises.length.
            // TODO: Consider rejecting only when N (or promises.length - N?)
            // promises have been rejected instead of only one?
            rejecter = function(err) {
                complete();
                deferred.reject(err);
            };

            handleProgress = deferred.progress;

            // TODO: Replace while with forEach
            for(i = 0; i < len; ++i) {
                if(i in promisesOrValues) {
                    when(promisesOrValues[i], resolve, reject, progress);
                }
            }
        }

        return ret;
    }

    /**
     * Return a promise that will resolve only once all the supplied promisesOrValues
     * have resolved. The resolution value of the returned promise will be an array
     * containing the resolution values of each of the promisesOrValues.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param [callback] {Function}
     * @param [errback] {Function}
     * @param [progressHandler] {Function}
     *
     * @returns {Promise}
     */
    function all(promisesOrValues, callback, errback, progressHandler) {
        var results, promise;

        results = allocateArray(promisesOrValues.length);
        promise = reduce(promisesOrValues, reduceIntoArray, results);

        return when(promise, callback, errback, progressHandler);
    }

    function reduceIntoArray(current, val, i) {
        current[i] = val;
        return current;
    }

    /**
     * Return a promise that will resolve when any one of the supplied promisesOrValues
     * has resolved. The resolution value of the returned promise will be the resolution
     * value of the triggering promiseOrValue.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param [callback] {Function}
     * @param [errback] {Function}
     * @param [progressHandler] {Function}
     *
     * @returns {Promise}
     */
    function any(promisesOrValues, callback, errback, progressHandler) {

        function unwrapSingleResult(val) {
            return callback(val[0]);
        }

        return some(promisesOrValues, 1, unwrapSingleResult, errback, progressHandler);
    }

    /**
     * Traditional map function, similar to `Array.prototype.map()`, but allows
     * input to contain {@link Promise}s and/or values, and mapFunc may return
     * either a value or a {@link Promise}
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param mapFunc {Function} mapping function mapFunc(value) which may return
     *      either a {@link Promise} or value
     *
     * @returns {Promise} a {@link Promise} that will resolve to an array containing
     *      the mapped output values.
     */
    function map(promisesOrValues, mapFunc) {

        var results, i;

        // Since we know the resulting length, we can preallocate the results
        // array to avoid array expansions.
        i = promisesOrValues.length;
        results = allocateArray(i);

        // Since mapFunc may be async, get all invocations of it into flight
        // asap, and then use reduce() to collect all the results
        for(;i >= 0; --i) {
            if(i in promisesOrValues)
                results[i] = when(promisesOrValues[i], mapFunc);
        }

        // Could use all() here, but that would result in another array
        // being allocated, i.e. map() would end up allocating 2 arrays
        // of size len instead of just 1.  Since all() uses reduce()
        // anyway, avoid the additional allocation by calling reduce
        // directly.
        return reduce(results, reduceIntoArray, results);
    }

    /**
     * Traditional reduce function, similar to `Array.prototype.reduce()`, but
     * input may contain {@link Promise}s and/or values, but reduceFunc
     * may return either a value or a {@link Promise}, *and* initialValue may
     * be a {@link Promise} for the starting value.
     *
     * @memberOf when
     *
     * @param promisesOrValues {Array} array of anything, may contain a mix
     *      of {@link Promise}s and values
     * @param reduceFunc {Function} reduce function reduce(currentValue, nextValue, index, total),
     *      where total is the total number of items being reduced, and will be the same
     *      in each call to reduceFunc.
     * @param initialValue starting value, or a {@link Promise} for the starting value
     *
     * @returns {Promise} that will resolve to the final reduced value
     */
    function reduce(promisesOrValues, reduceFunc, initialValue) {

        var total, args;

        total = promisesOrValues.length;

        // Skip promisesOrValues, since it will be used as 'this' in the call
        // to the actual reduce engine below.

        // Wrap the supplied reduceFunc with one that handles promises and then
        // delegates to the supplied.

        args = [
            function (current, val, i) {
                return when(current, function (c) {
                    return when(val, function (value) {
                        return reduceFunc(c, value, i, total);
                    });
                });
            }
        ];

        if (arguments.length >= 3) args.push(initialValue);

        return promise(reduceArray.apply(promisesOrValues, args));
    }

    /**
     * Ensure that resolution of promiseOrValue will complete resolver with the completion
     * value of promiseOrValue, or instead with resolveValue if it is provided.
     *
     * @memberOf when
     *
     * @param promiseOrValue
     * @param resolver {Resolver}
     * @param [resolveValue] anything
     *
     * @returns {Promise}
     */
    function chain(promiseOrValue, resolver, resolveValue) {
        var useResolveValue = arguments.length > 2;

        return when(promiseOrValue,
            function(val) {
				if(useResolveValue) val = resolveValue;
                resolver.resolve(val);
				return val;
            },
			function(e) {
				resolver.reject(e);
				return rejected(e);
			},
            resolver.progress
        );
    }

    //
    // Public API
    //

    when.defer     = defer;

    when.isPromise = isPromise;
    when.some      = some;
    when.all       = all;
    when.any       = any;

    when.reduce    = reduce;
    when.map       = map;

    when.chain     = chain;

    return when;
});
})(typeof define == 'function'
    ? define
    : function (factory) { typeof module != 'undefined'
        ? (module.exports = factory())
        : (this.when      = factory());
    }
    // Boilerplate for AMD, Node, and browser global
);

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/function-task',['require','common/guid','when'],function ( require ) {

  var guid = require( "common/guid" );
  var when = require( "when" );

  var Complete = function( value ) {
    if( !( this instanceof Complete ) ) {
      return new Complete( value );
    }
    this.value = value;
  };
  
  var DefaultSchedule = function() {
    if( !( this instanceof DefaultSchedule ) ) {
      return new DefaultSchedule();
    }
    this.tags = [];
    this.dependsOn = [];
  };

  // Task states
  var T_STARTED = 0,
  T_PAUSED = 1,
  T_CANCELLED = 2,
  T_CLOSED = 3;

  // Run states
  var R_RUNNING = 0,
  R_BLOCKED = 1,
  R_RESOLVED = 2,
  R_REJECTED = 3;

  var FunctionTask = function( scheduler, thunk, schedule, context ) {
    this.id = guid();
    this._thunk = thunk;
    this._taskState = T_PAUSED;
    this._runState = R_RESOLVED;
    this._scheduler = scheduler;
    this._schedule = schedule || DefaultSchedule();
    this.result = undefined;
    this._deferred = when.defer();
    this.then = this._deferred.promise.then;
    this._context = context || this;
  };

  function start( schedule ) {
    this._schedule = schedule || this._schedule;
    if( this._taskState !== T_PAUSED ) {
      throw new Error( "task is already started or completed" );
    }
    this._taskState = T_STARTED;
    if( this._runState !== R_BLOCKED ) {
      this._scheduler.insert( this, this.id, this._schedule );
    }
    return this;
  }

  function pause() {
    if( this._runState === R_RUNNING ) {
      throw new Error( "task can only be paused while blocked" );
    }
    this._taskState = T_PAUSED;
    this._scheduler.remove( this.id );      
    return this;
  }

  function cancel() {
    if( this._runState === R_RUNNING ) {
      throw new Error( "tasks can only be cancelled while blocked" );
    }
    this._taskState = T_CANCELLED;
    this._scheduler.insert( this, this.id );
    return this;
  }

  function isStarted() {
    return this._taskState === T_STARTED;
  }

  function isRunning() {
    return this._runState === R_RUNNING;
  }
  
  function isComplete() {
    return this._taskState === T_CLOSED;
  }

  // TD: this will need to change for cooperative tasks
  // TD: most of this prototype can be factored into a Task base
  function run() {
    var task = this;
    var result = task.result;
    task.result = undefined;
    task._scheduler.current = task;
    
    try{
      task._runState = R_RUNNING;
      if( task._taskState === T_CANCELLED ) {
        task._runState = R_RESOLVED;
        task._taskState = T_CLOSED;
      } else if( task._taskState === T_STARTED ) {
        // Run the task
        result = task._thunk.call( this._context, result );
        task._runState = R_BLOCKED;

        // Process the result
        if( result instanceof Complete ) {
          task.result = result.value;
          task._taskState = T_CLOSED;
          task._runState = R_RESOLVED;
          task._deferred.resolve( task.result );
        } else {
          task.result = when( result,
          // callback
          function( value ) {
            task.result = value;
            task._runState = R_RESOLVED;
            if( task._taskState === T_STARTED ) {
              task._scheduler.insert( task, task.id, task._schedule );
            }
          },
          // errback
          function( error ) {
            task.result = error;
            task._runState = R_REJECTED;
            if( task._threadState === T_STARTED ) {
              task._scheduler.insert( task, task.id, task._schedule );
            }
          }
          );
        }
      } else {
        throw Error( "task is not runnable" );
      }
    } catch( exception ) {
      task.result = exception;
      task._runState = R_REJECTED;
      task._deferred.reject( exception );
    }
    
    task._scheduler.current = null;
    return this;
  }

  function toString() {
    return "[object FunctionTask " + this.id + "]";
  }

  FunctionTask.prototype = {
      pause: pause,
      start: start,
      cancel: cancel,
      isStarted: isStarted,
      isRunning: isRunning,
      isComplete: isComplete,
      toString: toString,
      run: run,
      when: when,
      Complete: Complete
  };
  
  return FunctionTask;

} );
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('base/service',['require','core/function-task'],function( require ) {

  var Task = require( "core/function-task" );

  var Service = function( scheduler, schedules, dependsOn ) {
    this._schedules = schedules || {};
    this.dependsOn = dependsOn || [];
    this._tasks = {};
    this._registeredComponents = {};

    if( scheduler ) {
      var i, l;
      var callbackNames = Object.keys( this._schedules );
      for( i = 0, l = callbackNames.length; i < l; ++ i ) {
        var callbackName = callbackNames[i];
        if( !this[callbackName] ) {
          throw new Error( "missing scheduler target: " + callbackName );
        }
        var schedule = this._schedules[callbackName] || {};
        // Create a new task to run this callback
        this._tasks[callbackName] = new Task( scheduler, this[callbackName],
            schedule, this );
        this._tasks[callbackName].start();
      }
    }
  };
  
  function registerComponent( id, component ) {
    if( !this._registeredComponents.hasOwnProperty( component.type ) ) {
      this._registeredComponents[component.type] = {};
    }
    this._registeredComponents[component.type][id] = component;
    
    return this;
  }
  
  function unregisterComponent( id, component ) {
    if( this._registeredComponents.hasOwnProperty( component.type ) &&
        this._registeredComponents[component.type].hasOwnProperty( id ) ) {
      delete this._registeredComponents[component.type][id];
    }
    
    return this;
  }
  
  function suspend() {
    var i, l;
    var taskNames = Object.keys( this._tasks );
    for( i = 0, l = taskNames.length; i < l; ++ i ) {
      var taskName = taskNames[i];
      this._tasks[taskName].pause();
    }
    
    return this;
  }
  
  function resume() {
    var i, l;
    var taskNames = Object.keys( this._tasks );
    for( i = 0, l = taskNames.length; i < l; ++ i ) {
      var taskName = taskNames[i];
      var schedule = this._schedules[taskName] || {};
      this._tasks[taskName].start( schedule );
    }
    
    return this;
  }
  
  function handleEvent( event ) {
    var i, l;

    if( "on" + event.type in this ) {
      var handler = this["on" + event.type];
      try {
        handler.call( this, event );
      } catch( error ) {
        console.log( error );
      }
    }
  }

  Service.prototype = {
      registerComponent: registerComponent,
      unregisterComponent: unregisterComponent,
      suspend: suspend,
      resume: resume,
      handleEvent: handleEvent
  };

  return Service;

});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('common/extend',['require'],function ( require ) {
  

  function extend( object, extra ) {
    for ( var prop in extra ) {                
      if ( !object.hasOwnProperty( prop ) && extra.hasOwnProperty( prop ) ) {
        object[prop] = extra[prop];
      }
    }
    return object;
  }

  return extend;

});

if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('core/event',['require'],function( require ) {

  var Event = function( type, data, queue ) {
    function dispatcher() {
      var i, l;
      for( i = 0, l = arguments.length; i < l; ++ i ) {
        try {
          var handler = arguments[i];
          if( handler.handleEvent ) {
            handler.handleEvent( dispatcher );
          }
        } catch( error ) {
          console.log( error );
        }
      }
    }

    dispatcher.type = type;
    dispatcher.data = data;
    dispatcher.queue = undefined !== queue ? queue : true;

    return dispatcher;

  };

  return Event;

});
define('src/loaders/image',['require'],function(require) {
    function ImageLoader(url, loadSuccess, loadFailure) {
        var img = new Image();
        img.onload = function() {
            if (img.complete) {
                loadSuccess.call(null, img);
            } else {
                loadFailure.call(null, 'Failed to load image: ' + url);
            }
        };
        img.src = url;
    }

    return ImageLoader;
});
define('src/services/renderer',['require','base/service','common/extend','core/event','src/loaders/image'],function(require) {
    var Service = require('base/service');
    var extend = require('common/extend');
    var Event = require('core/event');

    function Renderer(scheduler, options) {
        Service.call(this, scheduler, {
            render: {
                tags: ['@render', 'graphics'],
                dependsOn: []
            }
        });

        options = options || {};
        this.canvas = options.canvas || null;
        this.ctx = (this.canvas !== null ? this.canvas.getContext('2d') : null);
    }
    Renderer.prototype = Object.create(Service.prototype);
    Renderer.prototype.constructor = Renderer;

    extend(Renderer.prototype, {
        render: function() {
            if (this.canvas === null) return;

            var renderEvent = new Event('Render', {
                ctx: this.ctx
            });

            this.ctx.save();
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.forEachComponent(function(component) {
                while(component.handleQueuedEvent()) {
                    // Pass
                }
                renderEvent(component);
            });

            this.ctx.restore();
        },

        forEachComponent: function(callback, type) {
            var components = this._registeredComponents;
            for (var componentType in components) {
                if (type !== undefined && componentType !== type) return;
                for (var entityId in components[componentType]) {
                    callback.call(this, components[componentType][entityId]);
                }
            }
        },

        // Loaders have nowhere else to live. :(
        loaders: {
           image: require('src/loaders/image')
        }
    });

    return Renderer;
});
if ( typeof define !== "function" ) {
  var define = require( "amdefine" )( module );
}

define('base/component',['require','core/event'],function( require ) {

  var Event = require( "core/event" );

  var Component = function( type, provider, dependsOn ) {
    this.type = type; // String identifying the type of this component
    this.provider = provider; // Reference to the object instance that provides
                              // this component
    this.dependsOn = dependsOn || []; // List of component types that this
                                      // component depends on
    this.owner = null; // Reference to the entity instance that owns this
    this._queuedEvents = []; // List of queued events
  };

  function setOwner( owner ) {
    if( owner !== this.owner ) {
      var previous = this.owner;
      this.owner = owner;
      var event = new Event(
        'ComponentOwnerChanged',
        {
          current: owner,
          previous: previous
        },
        false
      );
      event( this );
    }
  }

  function handleEvent( event ) {
    if( "on" + event.type in this ) {
      if( event.queue ) {
        this._queuedEvents.push( event );
      } else {
        var handler = this["on" + event.type];
        try {
          handler.call( this, event );
        } catch( error ) {
          console.log( error );
        }
      }
    }
  }

  function handleQueuedEvent() {
    if( this._queuedEvents.length > 0 ) {
      var event = this._queuedEvents.shift();
      if( "on" + event.type in this ) {
        var handler = this["on" + event.type];
        try {
          handler.call( this, event );
        } catch( error ) {
          debugger;
          console.log( error );
        }
      }
    }
    return this._queuedEvents.length;
  }

  Component.prototype = {
      setOwner: setOwner,
      handleEvent: handleEvent,
      handleQueuedEvent: handleQueuedEvent
  };

  return Component;

});
define('src/components/g2d',['require','base/component','common/extend'],function(require) {
    var Component = require('base/component');
    var extend = require('common/extend');

    function g2d(service, options) {
        Component.call(this, '2d', service);

        options = options || {};
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.graphic = options.graphic || null;
    }
    g2d.prototype = Object.create(Component.prototype);
    g2d.prototype.constructor = g2d;

    extend(g2d.prototype, {
        onRender: function(event) {
            var data = event.data;
            this.graphic.render(data.ctx, this.x, this.y);
        },

        onEntitySpaceChanged: function(event) {
            var data = event.data;
            if (data.previous === null && data.current !== null && this.owner !== null) {
                this.provider.registerComponent(this.owner.id, this);
            }

            if (data.previous !== null && data.current === null && this.owner !== null) {
                this.provider.unregisterComponent(this.owner.id, this);
            }
        },

        onComponentOwnerChanged: function(event) {
            var data = event.data;
            if (data.previous === null && this.owner !== null) {
                this.provider.registerComponent(this.owner.id, this);
            }

            if (this.owner === null && data.previous !== null) {
                this.provider.unregisterComponent(data.previous.id, this);
            }
        },

        onEntityActivationChanged: function(event) {
            var active = event.data;
            if (active) {
                this.provider.registerComponent(this.owner.id, this);
            } else {
                this.provider.unregisterComponent(this.owner.id, this);
            }
        }
    });

    return g2d;
});
define('src/resources/graphic',['require'],function(require) {
    function Graphic(img) {
        this.img = img;
    }

    Graphic.prototype = {
        render: function(ctx, x, y) {
            ctx.drawImage(this.img, x, y);
        }
    };

    return Graphic;
});
define('../src/gladius-2d',['require','base/extension','src/services/renderer','src/components/g2d','src/resources/graphic'],function(require) {
	var Extension = require('base/extension');

	return new Extension('gladius-2d', {
		services: {
            renderer: {
                service: require('src/services/renderer'),
                components: {
                    g2d: require('src/components/g2d')
                },
                resources: {}
            }
        },
		components: {},
		resources: {
            Graphic: require('src/resources/graphic')
        }
	})
});
  var extension = require( "../src/gladius-2d" );

  return extension;

}));

