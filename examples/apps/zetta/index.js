// ARN 
'use strict';
module.change_code = 1;
var _ = require('lodash');
var util = require('util');

var Alexa = require('alexa-app');
var extend = require('node.extend');

var restClient = require('node-rest-client').Client;
var zetta = new restClient();
// registering remote methods
zetta.registerMethod("queryDevices", "http://demo.zettaapi.org", "GET");

var app = new Alexa.app('zetta');

app.launch(function(req, res) {
  var prompt = 'To control your devices, tell me a device command or ask for a device state.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

// STATE INTENT
var deviceStateSlots = {'DEVICETYPE':'DEVICETYPE', 'SERVERNAME':'SERVERNAME'};
var deviceUtterance = "{|the} {DEVICETYPE} {|at} {SERVERNAME}";

app.intent('stateIntent', {
    'slots': deviceStateSlots,
    'utterances': ["{status|state} {|of|for} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var deviceType = req.slot('DEVICETYPE');
    var serverName = req.slot('SERVERNAME');
    var reprompt = 'Ask me for the state of a device type and location.';
    if (_.isEmpty(deviceType) || _.isEmpty(serverName)) {
      var prompt = 'I didn\'t hear a state request for a device type and location. Please ask me for the state of a device type and location.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      var args = {
        parameters: { ql: 'where type="' + deviceType + '"', server: serverName }
      };
      zetta.methods.queryDevices(args, function (data, response) {
        data = JSON.parse(data.toString('utf8'));
        var deviceState = data.entities[0].properties.state;
        console.log('deviceState: ' + deviceState);
        res.say(deviceType + ' at ' + serverName + ' is ' + deviceState + '.').send();
      });
      return false;
    }
  }
);


// ACTION INTENT

var deviceActionSlots = extend(true, deviceStateSlots, {'DEVICEACTION': 'DEVICEACTION'});

app.intent('actionIntent', {
    'slots': deviceActionSlots,
    'utterances': ["{DEVICEACTION} " + deviceUtterance]
  },

  function(req, res) {
    //get the slot
    var deviceAction = req.slot('DEVICEACTION');
    var deviceType = req.slot('DEVICETYPE');
    var serverName = req.slot('SERVERNAME');
    var reprompt = 'Tell me an action, device type and location.';
    if (_.isEmpty(deviceAction) || _.isEmpty(deviceType) || _.isEmpty(serverName)) {
      var prompt = 'I didn\'t hear an action, device type and location. Please give me the information in order to use a device.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false);
      return true;
    } else {
      res.say('Now sending request to ' + deviceAction + ' ' + deviceType + ' at ' + serverName + '.').send();
      
      var args = {
        parameters: { ql: 'where type="' + deviceType + '"', server: serverName }
      };
      zetta.methods.queryDevices(args, function (data, response) {
        data = JSON.parse(data.toString('utf8'));
        var deviceURL = data.entities[0].links[0].href;
        console.log('deviceURL: ' + deviceURL);
        zetta.registerMethod("actOnDevice", deviceURL, "POST");
        var postArgs = {
          headers: { "Content-Type": 'application/x-www-form-urlencoded' },
          data: "action=" + deviceAction
        };
        zetta.methods.actOnDevice(postArgs, function(data, response) {
          if (data.length > 0) {
            data = JSON.parse(data.toString('utf8'));
          }
          console.log('data: ' + util.inspect(data));
        })
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