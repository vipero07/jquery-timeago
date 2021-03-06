/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 1.3.1
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2013, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */

(function (factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else {
    // Browser globals
    factory(jQuery);
  }
}(function ($) {
  $.timeago = function(timestamp) {
    if (timestamp instanceof Date) {
      return inWords(timestamp);
    } else if (typeof timestamp === "string") {
      return inWords($.timeago.parse(timestamp));
    } else if (typeof timestamp === "number") {
      return inWords(new Date(timestamp));
    } else {
      return inWords($.timeago.datetime(timestamp));
    }
  };
  var $t = $.timeago,
      substitute = function (stringOrFunction, number, $l, distanceMillis) {
          var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction,
              value = ($l.numbers && $l.numbers[number]) || number;
          return string.replace(/%d/i, value);
      },
      makeString = [
          function (time, $l, distanceMillis) {
              throw new Error("Not a valid number '" + time);
          },
          function (time, $l, distanceMillis) {
              //time is 1 digit long
              return substitute($l.seconds, Math.round(time), $l, distanceMillis);
          },
          function (time, $l, distanceMillis) {
              //time is 2 digits long
              return time < 45 && makeString[1](time, $l, distanceMillis) ||
                  time < 90 && substitute($l.minute, 1, $l, distanceMillis) ||
                  makeString[3](time, $l, distanceMillis);
          },
          function (time, $l, distanceMillis) {
              //time is 3 digits long
              return substitute($l.minutes, Math.round(time / 60), $l, distanceMillis); //minute
          },
          function (time, $l, distanceMillis) {
              //time is 4 digits long
              return time < 2700 && makeString[3](time, $l, distanceMillis) ||
                  time < 5400 && substitute($l.hour, 1, $l, distanceMillis) ||
                  makeString[5](time, $l, distanceMillis);
          },
          function (time, $l, distanceMillis) {
              //time is 5 digits long
              return time < 86400 && substitute($l.hours, Math.round(time / 60 / 60), $l, distanceMillis) || //hour
                  substitute($l.day, 1, $l, distanceMillis);
          },
          function (time, $l, distanceMillis) {
              //time is 6 digits long
              return time < 151200 && substitute($l.day, 1, $l, distanceMillis) ||
                  substitute($l.days, Math.round(time / 60 / 60 / 24), $l, distanceMillis); //day
          },
          function (time, $l, distanceMillis) {
              //time is 7 digits long
              return time < 2592000 && makeString[6](time, $l, distanceMillis) ||
                  time < 3888000 && substitute($l.month, 1, $l, distanceMillis) ||
                  substitute($l.months, Math.round(time / 60 / 60 / 24 / 30), $l, distanceMillis); //month
          },
          function (time, $l, distanceMillis) {
              //time is 8 digits long
              return time < 31536000 && makeString[7](time, $l, distanceMillis) ||
                  time < 47304000 && substitute($l.year, 1, $l, distanceMillis) ||
                  substitute($l.years, Math.round(time / 60 / 60 / 24 / 365), $l, distanceMillis); //year
          }
      ],
      regex = [
          /\.\d+/, // milliseconds
          /-/g,
          /T/,
          /Z/,
          /([\+\-]\d\d)\:?(\d\d)/, // -04:00 -> -0400
          /([\+\-]\d\d)$/ // +09 -> +0900
      ];

  $.extend($.timeago, {
    settings: {
      refreshMillis: 60000,
      allowFuture: false,
      localeTitle: false,
      cutoff: 0,
      strings: {
        prefixAgo: null,
        prefixFromNow: null,
        suffixAgo: "ago",
        suffixFromNow: "from now",
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
      }
    },
    inWords: function(distanceMillis) {
      var $l = this.settings.strings;
      var prefix = $l.prefixAgo;
      var suffix = $l.suffixAgo;
      if (this.settings.allowFuture) {
        if (distanceMillis < 0) {
          prefix = $l.prefixFromNow;
          suffix = $l.suffixFromNow;
        }
      }

      var seconds = Math.abs(distanceMillis) / 1000,
          secondLength = Math.floor(Math.log(seconds) / Math.log(10)) + 1,
          words = typeof makeString[secondLength] != "undefined" ? makeString[secondLength](seconds, $l, distanceMillis) : makeString[8](seconds, $l, distanceMillis);

      var separator = $l.wordSeparator || "";
      if ($l.wordSeparator === undefined) { separator = " "; }
      return $.trim([prefix, words, suffix].join(separator));
    },
    parse: function(iso8601) {
      var s = $.trim(iso8601);
      
      if(!Date.prototype.toISOString){
          s = s.replace(regex[0], "") // remove milliseconds
            .replace(regex[1], "/")
            .replace(regex[2], " ")
            .replace(regex[3], " UTC")
            .replace(regex[4], " $1$2") // -04:00 -> -0400
            .replace(regex[5], " $100"); // +09 -> +0900
      }
          
      return new Date(s);
    },
    datetime: function(elem) {
      var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
      return $t.parse(iso8601);
    },
    isTime: function(elem) {
      // jQuery's `is()` doesn't play well with HTML5 in IE
      return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
    }
  });

  // functions that can be called via $(el).timeago('action')
  // init is default when no action is given
  // functions are called with context of a single element
  var functions = {
    init: function(){
      var refresh_el = $.proxy(refresh, this);
      refresh_el();
      var $s = $t.settings;
      if ($s.refreshMillis > 0) {
        this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
      }
    },
    update: function(time){
      var parsedTime = $t.parse(time);
      $(this).data('timeago', { datetime: parsedTime });
      if($t.settings.localeTitle) $(this).attr("title", parsedTime.toLocaleString());
      refresh.apply(this);
    },
    updateFromDOM: function(){
      $(this).data('timeago', { datetime: $t.parse( $t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title") ) });
      refresh.apply(this);
    },
    dispose: function () {
      if (this._timeagoInterval) {
        window.clearInterval(this._timeagoInterval);
        this._timeagoInterval = null;
      }
    }
  };

  $.fn.timeago = function(action, options) {
    var fn = action ? functions[action] : functions.init;
    if(!fn){
      throw new Error("Unknown function name '"+ action +"' for timeago");
    }
    // each over objects here and call the requested function
    this.each(function(){
      fn.call(this, options);
    });
    return this;
  };

  function refresh() {
    var data = prepareData(this);
    var $s = $t.settings;

    if (!isNaN(data.datetime)) {
      if ( $s.cutoff == 0 || distance(data.datetime) < $s.cutoff) {
        $(this).text(inWords(data.datetime));
      }
    }
    return this;
  }

  function prepareData(element) {
    element = $(element);
    if (!element.data("timeago")) {
      element.data("timeago", { datetime: $t.datetime(element) });
      var text = $.trim(element.text());
      if ($t.settings.localeTitle) {
        element.attr("title", element.data('timeago').datetime.toLocaleString());
      } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
        element.attr("title", text);
      }
    }
    return element.data("timeago");
  }

  function inWords(date) {
    return $t.inWords(distance(date));
  }

  function distance(date) {
    return (new Date().getTime() - date.getTime());
  }

  // fix for IE6 suckage
  document.createElement("abbr");
  document.createElement("time");
}));
