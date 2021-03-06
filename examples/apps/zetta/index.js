// TODO: handle hyphenated actions
// ARN arn:aws:lambda:us-east-1:193654999912:function:zetta
'use strict';
module.change_code = 1;
var _ = require('lodash');
var util = require('util');

var Alexa = require('alexa-app');
var extend = require('node.extend');

var restClient = require('node-rest-client').Client;
var zetta = new restClient();
zetta.registerMethod("queryDevices", "http://demo.zettaapi.org", "GET");

var IsNumeric = function (input) { return (input - 0) == input && (''+input).trim().length > 0; }
var camelize = function (str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
    if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
    return index == 0 ? match.toLowerCase() : match.toUpperCase();
  });
}

var app = new Alexa.app('zetta');

app.launch(function(req, res) {
  var prompt = 'To control your devices, tell me a device command or ask for a device state.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

// STATE INTENT
var deviceStateSlots = {'DEVICETYPE':'DEVICETYPE', 'SERVERNAME':'SERVERNAME'};
var deviceUtterance = "{|of|for|on|of the|for the|on the} {DEVICETYPE} {at|in} {SERVERNAME}";

app.intent('stateIntent', {
    'slots': deviceStateSlots,
    'utterances': ["{state|status|what is the state|what's the state|what is the status|what's the status} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var deviceType = req.slot('DEVICETYPE').replace(/\s+/g, '-').toLowerCase();
    var serverName = req.slot('SERVERNAME').replace(/\s+/g, '-').toLowerCase();
    var reprompt = 'Ask me for the state of a device type and location.';
    if (_.isEmpty(deviceType) || _.isEmpty(serverName)) {
      var prompt = 'I didn\'t hear a state request for a device type and location. Please ask me for the state of a device type and location.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      var args = {
        parameters: { ql: 'where type="' + deviceType + '"', server: serverName }
      };
      console.log('about to call device query in state intent.');
      console.log('args: ' + util.inspect(args));
      zetta.methods.queryDevices(args, function (data, response) {
        var deviceState = 'unknown';
        if (data.length > 0) {
          data = JSON.parse(data.toString('utf8'));
          deviceState = data.entities[0].properties.state;
          console.log('deviceState: ' + deviceState);
        }
        var words = deviceType + ' at ' + serverName + ' is ' + deviceState + '.';
        console.log('words: ' + words);
        res.say(words).send();
      });
      return false;
    }
  }
);

// PROPERTY INTENT
var devicePropertySlots = extend(true, deviceStateSlots, {'DEVICEPROPERTY': 'LITERAL'});

app.intent('propertyIntent', {
    'slots': devicePropertySlots,
    'utterances': ["{what is the|what's the} {DEVICEPROPERTY} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var deviceType = req.slot('DEVICETYPE').replace(/\s+/g, '-').toLowerCase();
    var serverName = req.slot('SERVERNAME').replace(/\s+/g, '-').toLowerCase();
    var deviceProperty = camelize(req.slot('DEVICEPROPERTY'));
    var reprompt = 'Ask me for the value of a property of a device type and location.';
    if (_.isEmpty(deviceType) || _.isEmpty(serverName) || _.isEmpty(deviceProperty)) {
      var prompt = 'I didn\'t hear a request for a device property, type and location. Please ask me for the value of a property of a device type and location.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      var args = {
        parameters: { ql: 'where type="' + deviceType + '"', server: serverName }
      };
      console.log('about to call device query in state intent.');
      console.log('args: ' + util.inspect(args));
      zetta.methods.queryDevices(args, function (data, response) {
        var devicePropertyValue = 'unknown';
        if (data.length > 0) {
          data = JSON.parse(data.toString('utf8'));
          devicePropertyValue = data.entities[0].properties[deviceProperty];
          console.log('deviceProperty: ' + deviceProperty);
        }
        if (IsNumeric(devicePropertyValue)) {
          devicePropertyValue = Math.round(devicePropertyValue * 100) / 100;
        }
        var words = deviceProperty + ' of ' + deviceType + ' at ' + serverName + ' is ' + devicePropertyValue + '.';
        console.log('words: ' + words);
        res.say(words).send();
      });
      return false;
    }
  }
);

// ACTION INTENT

var deviceActionSlots = extend(true, deviceStateSlots, {'DEVICEACTION': 'DEVICEACTION'});

app.intent('callIntent', {
    'slots': deviceActionSlots,
    'utterances': ["{|call|request} {DEVICEACTION} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var deviceAction = req.slot('DEVICEACTION').replace(/\s+/g, '-').toLowerCase();
    var deviceType = req.slot('DEVICETYPE').replace(/\s+/g, '-').toLowerCase();
    var serverName = req.slot('SERVERNAME').replace(/\s+/g, '-').toLowerCase();
    var reprompt = 'Tell me an action, device type and location.';
    if (_.isEmpty(deviceAction) || _.isEmpty(deviceType) || _.isEmpty(serverName)) {
      var prompt = 'I didn\'t hear an action, device type and location. Please give me the information in order to use a device.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      var args = {
        parameters: { ql: 'where type="' + deviceType + '"', server: serverName }
      };
      console.log('about to call device query in call intent.');
      zetta.methods.queryDevices(args, function (data, response) {
        if (data.length > 0) {
          console.log('data: ' + util.inspect(data));
          data = JSON.parse(data.toString('utf8'));
          var deviceURL = data.entities[0].links[0].href;
          console.log('deviceURL: ' + deviceURL);
          zetta.registerMethod("actOnDevice", deviceURL, "POST");
          var postArgs = {
            headers: { "Content-Type": 'application/x-www-form-urlencoded' },
            data: "action=" + deviceAction
          };
          console.log('about to call device action in call intent.');
          zetta.methods.actOnDevice(postArgs, function(data, response) {
            if (data.length > 0) {
              data = JSON.parse(data.toString('utf8'));
              console.log('data: ' + util.inspect(data));
            } else {
              console.log('data: <empty>');
            }
            var words = 'I sent the request to ' + deviceAction + ' ' + deviceType + ' at ' + serverName + '.';
            console.log('words: ' + words);
            res.say(words).send();
          })
        } else {
          var words = 'Unable to find ' + deviceType + ' at ' + serverName;
          console.log('words: ' + words);
          res.say(words).send();
        }
      });
      return false;
    }
  }
);

//hack to support custom utterances in utterance expansion string
var utterancesMethod = app.utterances;
app.utterances = function() {
  return utterancesMethod().replace(/\{\-\|/g, '{');
};

module.exports = app;